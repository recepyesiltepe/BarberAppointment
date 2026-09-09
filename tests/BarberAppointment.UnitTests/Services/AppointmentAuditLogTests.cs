using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using EmployeeServiceEntity = BarberAppointment.Domain.Entities.EmployeeService;

namespace BarberAppointment.UnitTests.Services;

public class AppointmentAuditLogTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IEmployeeRepository> _employeeRepoMock;
    private readonly Mock<IServiceRepository> _serviceRepoMock;
    private readonly Mock<IAuditLogRepository> _auditLogRepoMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly IWorkHoursPolicy _workHoursPolicy;

    private readonly AppointmentService _appointmentService;
    private readonly DateTime _baseNow = new(2026, 6, 10, 8, 0, 0, DateTimeKind.Utc);

    public AppointmentAuditLogTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _appointmentRepoMock = new Mock<IAppointmentRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _employeeRepoMock = new Mock<IEmployeeRepository>();
        _serviceRepoMock = new Mock<IServiceRepository>();
        _auditLogRepoMock = new Mock<IAuditLogRepository>();
        _dateTimeProviderMock = new Mock<IDateTimeProvider>();
        _emailServiceMock = new Mock<IEmailService>();

        _unitOfWorkMock.Setup(u => u.Appointments).Returns(_appointmentRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Users).Returns(_userRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Employees).Returns(_employeeRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Services).Returns(_serviceRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.AuditLogs).Returns(_auditLogRepoMock.Object);

        _dateTimeProviderMock.Setup(d => d.UtcNow).Returns(_baseNow);
        _dateTimeProviderMock.Setup(d => d.Today).Returns(_baseNow.Date);

        _workHoursPolicy = new DefaultWorkHoursPolicy();

        _appointmentService = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object);
    }

    private User CreateValidUser(int id = 1) => new()
    {
        Id = id,
        FullName = "Mehmet Demir",
        Email = "mehmet@example.com",
        Phone = "05559998877",
        IsActive = true,
        Role = UserRole.Customer
    };

    private Service CreateValidService(int id = 1) => new()
    {
        Id = id,
        Name = "Sakal Tıraşı",
        DurationMinutes = 30,
        Price = 150,
        IsActive = true
    };

    private Employee CreateValidEmployee(int id = 1)
    {
        var emp = new Employee
        {
            Id = id,
            FullName = "Kemal Berber",
            IsActive = true,
            WorkStartTime = new TimeSpan(9, 0, 0),
            WorkEndTime = new TimeSpan(19, 0, 0)
        };
        emp.EmployeeServices = new List<EmployeeServiceEntity>
        {
            new() { EmployeeId = id, ServiceId = 1, Employee = emp }
        };
        return emp;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Created: Randevu oluşturulduğunda AuditLog kaydı oluşturulmalı
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task CreateAsync_CreatesAuditLogWithCreatedAction()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(10);
        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            StartAt = appointmentDate
        };

        var user = CreateValidUser(1);
        var service = CreateValidService(1);
        var employee = CreateValidEmployee(1);

        _userRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _appointmentRepoMock.Setup(a => a.HasConflictAsync(1, appointmentDate, appointmentDate.AddMinutes(30), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        AppointmentAuditLog? capturedLog = null;
        _auditLogRepoMock.Setup(a => a.AddAsync(It.IsAny<AppointmentAuditLog>(), It.IsAny<CancellationToken>()))
            .Callback<AppointmentAuditLog, CancellationToken>((log, _) => capturedLog = log)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _appointmentService.CreateAsync(dto, requestingUserId: 1, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        capturedLog.Should().NotBeNull();
        capturedLog!.Action.Should().Be("Created");
        capturedLog.OldStatus.Should().BeNull();
        capturedLog.NewStatus.Should().Be("Confirmed");
        capturedLog.ChangedByUserId.Should().Be(1);
        capturedLog.ChangedByRole.Should().Be("Customer");
        capturedLog.ChangedByName.Should().Be("Mehmet Demir");
        capturedLog.ChangedDate.Should().Be(_baseNow);
        capturedLog.Details.Should().Contain("Randevu oluşturuldu");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Rescheduled: Randevu yeniden zamanlandığında AuditLog kaydı oluşturulmalı
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task RescheduleAsync_CreatesAuditLogWithOldAndNewDetails()
    {
        // Arrange
        var oldStart = _baseNow.Date.AddDays(1).AddHours(10);
        var appointment = new Appointment
        {
            Id = 10,
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            StartAt = oldStart,
            EndAt = oldStart.AddMinutes(30),
            Status = AppointmentStatus.Confirmed,
            User = CreateValidUser(1),
            Employee = CreateValidEmployee(1),
            Service = CreateValidService(1)
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(appointment);

        var newStart = _baseNow.Date.AddDays(1).AddHours(14);
        _appointmentRepoMock.Setup(a => a.HasConflictAsync(1, newStart, newStart.AddMinutes(30), 10, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        AppointmentAuditLog? capturedLog = null;
        _auditLogRepoMock.Setup(a => a.AddAsync(It.IsAny<AppointmentAuditLog>(), It.IsAny<CancellationToken>()))
            .Callback<AppointmentAuditLog, CancellationToken>((log, _) => capturedLog = log)
            .Returns(Task.CompletedTask);

        var updateDto = new UpdateAppointmentDto { StartAt = newStart };

        // Act
        var result = await _appointmentService.RescheduleAsync(10, updateDto, requestingUserId: 1, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        capturedLog.Should().NotBeNull();
        capturedLog!.Action.Should().Be("Rescheduled");
        capturedLog.OldStatus.Should().Be("Confirmed");
        capturedLog.NewStatus.Should().Be("Confirmed");
        capturedLog.ChangedByUserId.Should().Be(1);
        capturedLog.ChangedDate.Should().Be(_baseNow);
        capturedLog.Details.Should().Contain("Eski saat");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Cancelled: Randevu iptal edildiğinde AuditLog kaydı oluşturulmalı
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task CancelAsync_CreatesAuditLogWithCancelledStatus()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 20,
            UserId = 1,
            Status = AppointmentStatus.Confirmed,
            User = CreateValidUser(1)
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(20, It.IsAny<CancellationToken>())).ReturnsAsync(appointment);

        AppointmentAuditLog? capturedLog = null;
        _auditLogRepoMock.Setup(a => a.AddAsync(It.IsAny<AppointmentAuditLog>(), It.IsAny<CancellationToken>()))
            .Callback<AppointmentAuditLog, CancellationToken>((log, _) => capturedLog = log)
            .Returns(Task.CompletedTask);

        // Act
        await _appointmentService.CancelAsync(20, requestingUserId: 1, isAdmin: false);

        // Assert
        capturedLog.Should().NotBeNull();
        capturedLog!.Action.Should().Be("Cancelled");
        capturedLog.OldStatus.Should().Be("Confirmed");
        capturedLog.NewStatus.Should().Be("Cancelled");
        capturedLog.ChangedByUserId.Should().Be(1);
        capturedLog.ChangedByName.Should().Be("Mehmet Demir");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Completed: Randevu tamamlandığında AuditLog kaydı oluşturulmalı
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task CompleteAsync_CreatesAuditLogWithCompletedStatus()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 30,
            UserId = 1,
            Status = AppointmentStatus.Confirmed
        };

        _appointmentRepoMock.Setup(a => a.GetByIdAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(appointment);

        AppointmentAuditLog? capturedLog = null;
        _auditLogRepoMock.Setup(a => a.AddAsync(It.IsAny<AppointmentAuditLog>(), It.IsAny<CancellationToken>()))
            .Callback<AppointmentAuditLog, CancellationToken>((log, _) => capturedLog = log)
            .Returns(Task.CompletedTask);

        // Act
        await _appointmentService.CompleteAsync(30, requestingUserId: 999, isAdmin: true);

        // Assert
        capturedLog.Should().NotBeNull();
        capturedLog!.Action.Should().Be("Completed");
        capturedLog.OldStatus.Should().Be("Confirmed");
        capturedLog.NewStatus.Should().Be("Completed");
        capturedLog.ChangedByRole.Should().Be("Admin");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Immutability: Audit log kayıtları değiştirilemez veya silinemez
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task AppDbContext_AuditLog_WhenModified_ThrowsInvalidOperationException()
    {
        // Arrange: InMemory EF Core DbContext
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var log = new AppointmentAuditLog
        {
            AppointmentId = 1,
            Action = "Created",
            NewStatus = "Confirmed",
            ChangedDate = DateTime.UtcNow
        };

        context.AppointmentAuditLogs.Add(log);
        await context.SaveChangesAsync();

        // Act: Kaydı değiştirmeye çalış
        log.Action = "TamperedAction";

        // Assert: Değişikliğin SaveChanges tarafından engellendiğini doğrula
        var act = async () => await context.SaveChangesAsync();
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*değiştirilemez veya silinemez*");
    }

    [Fact]
    public async Task AppDbContext_AuditLog_WhenDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var log = new AppointmentAuditLog
        {
            AppointmentId = 2,
            Action = "Cancelled",
            NewStatus = "Cancelled",
            ChangedDate = DateTime.UtcNow
        };

        context.AppointmentAuditLogs.Add(log);
        await context.SaveChangesAsync();

        // Act: Kaydı silmeye çalış
        context.AppointmentAuditLogs.Remove(log);

        // Assert: Silme işleminin engellendiğini doğrula
        var act = async () => await context.SaveChangesAsync();
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*değiştirilemez veya silinemez*");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. AuditLogService: Filtrelenmiş liste sorgulama testi
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task AuditLogService_GetFilteredAsync_ReturnsDtoList()
    {
        // Arrange
        var mockRepo = new Mock<IAuditLogRepository>();
        var logs = new List<AppointmentAuditLog>
        {
            new() { Id = 1, AppointmentId = 5, Action = "Created", NewStatus = "Confirmed", ChangedDate = _baseNow },
            new() { Id = 2, AppointmentId = 5, Action = "Rescheduled", OldStatus = "Confirmed", NewStatus = "Confirmed", ChangedDate = _baseNow.AddHours(1) }
        };

        mockRepo.Setup(r => r.GetFilteredAsync(5, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(logs);

        var uowMock = new Mock<IUnitOfWork>();
        uowMock.Setup(u => u.AuditLogs).Returns(mockRepo.Object);

        var loggerMock = new Mock<ILogger<AuditLogService>>();
        var service = new AuditLogService(uowMock.Object, _dateTimeProviderMock.Object, loggerMock.Object);

        // Act
        var result = await service.GetFilteredAsync(new AuditLogFilterDto { AppointmentId = 5 });

        // Assert
        result.Should().HaveCount(2);
        result[0].Action.Should().Be("Created");
        result[1].Action.Should().Be("Rescheduled");
    }
}

