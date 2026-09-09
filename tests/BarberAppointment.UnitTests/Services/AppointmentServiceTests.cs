using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;
using FluentAssertions;
using Moq;
using Xunit;
using EmployeeServiceEntity = BarberAppointment.Domain.Entities.EmployeeService;

namespace BarberAppointment.UnitTests.Services;

public class AppointmentServiceTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IEmployeeRepository> _employeeRepoMock;
    private readonly Mock<IServiceRepository> _serviceRepoMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly IWorkHoursPolicy _workHoursPolicy;

    private readonly AppointmentService _sut; // System Under Test

    private readonly DateTime _baseNow = new(2026, 6, 10, 8, 0, 0, DateTimeKind.Utc); // Çarşamba 08:00 UTC

    public AppointmentServiceTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _appointmentRepoMock = new Mock<IAppointmentRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _employeeRepoMock = new Mock<IEmployeeRepository>();
        _serviceRepoMock = new Mock<IServiceRepository>();
        _dateTimeProviderMock = new Mock<IDateTimeProvider>();
        _emailServiceMock = new Mock<IEmailService>();

        _unitOfWorkMock.Setup(u => u.Appointments).Returns(_appointmentRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Users).Returns(_userRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Employees).Returns(_employeeRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Services).Returns(_serviceRepoMock.Object);

        _dateTimeProviderMock.Setup(d => d.UtcNow).Returns(_baseNow);
        _dateTimeProviderMock.Setup(d => d.Today).Returns(_baseNow.Date);

        _workHoursPolicy = new DefaultWorkHoursPolicy(); // 09:00 - 20:00

        _sut = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object);
    }

    private User CreateValidUser(int id = 1, bool isActive = true)
    {
        return new User
        {
            Id = id,
            FullName = "Ahmet Yılmaz",
            Email = "ahmet@example.com",
            Phone = "05551112233",
            IsActive = isActive,
            Role = UserRole.Customer
        };
    }

    private Service CreateValidService(int id = 1, int durationMinutes = 30, bool isActive = true)
    {
        return new Service
        {
            Id = id,
            Name = "Saç Kesimi",
            DurationMinutes = durationMinutes,
            Price = 250,
            IsActive = isActive
        };
    }

    private Employee CreateValidEmployee(int id = 1, int serviceId = 1, bool isActive = true, DayOfWeek? offDay = DayOfWeek.Sunday)
    {
        var employee = new Employee
        {
            Id = id,
            FullName = "Ali Berber",
            Title = "Usta Berber",
            IsActive = isActive,
            WorkStartTime = new TimeSpan(9, 0, 0),
            WorkEndTime = new TimeSpan(19, 0, 0),
            WeeklyOffDay = offDay
        };

        employee.EmployeeServices = new List<EmployeeServiceEntity>
        {
            new EmployeeServiceEntity { EmployeeId = id, ServiceId = serviceId, Employee = employee }
        };

        return employee;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // KABUL KRİTERİ 3: Geçmiş tarihe randevu verilememe testi
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenStartAtIsInPast_ThrowsBusinessException()
    {
        // Arrange: Şu andan 1 saat öncesi
        var pastStartAt = _baseNow.AddHours(-1);
        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            StartAt = pastStartAt
        };

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*Geçmiş bir zamana randevu oluşturulamaz*");

        _appointmentRepoMock.Verify(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // KABUL KRİTERİ 4: Dolu saate randevu verilememe testi (Çakışma)
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenSlotHasConflict_ThrowsConflictException()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(11); // Yarın 11:00 (Perşembe)
        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            StartAt = appointmentDate
        };

        var user = CreateValidUser(1);
        var service = CreateValidService(1, 30);
        var employee = CreateValidEmployee(1, 1);

        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(dto.ServiceId, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(dto.EmployeeId, It.IsAny<CancellationToken>())).ReturnsAsync(employee);

        // Randevu çakışması olduğunu simüle et
        _appointmentRepoMock.Setup(a => a.HasConflictAsync(
            dto.EmployeeId,
            dto.StartAt,
            dto.StartAt.AddMinutes(30),
            null,
            It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<ConflictException>();
        exception.WithMessage("*başka bir randevusu bulunmaktadır*");

        _appointmentRepoMock.Verify(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // KABUL KRİTERİ 5: Pasif personel / hizmet / müşteri testi
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenEmployeeIsInactive_ThrowsBusinessException()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(14);
        var dto = new CreateAppointmentDto { UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = appointmentDate };

        var user = CreateValidUser(1);
        var service = CreateValidService(1);
        var inactiveEmployee = CreateValidEmployee(1, 1, isActive: false);

        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(dto.ServiceId, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(dto.EmployeeId, It.IsAny<CancellationToken>())).ReturnsAsync(inactiveEmployee);

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*personeli aktif değildir*");

        _appointmentRepoMock.Verify(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WhenServiceIsInactive_ThrowsBusinessException()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(14);
        var dto = new CreateAppointmentDto { UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = appointmentDate };

        var user = CreateValidUser(1);
        var inactiveService = CreateValidService(1, isActive: false);

        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(dto.ServiceId, It.IsAny<CancellationToken>())).ReturnsAsync(inactiveService);

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*hizmeti aktif değildir*");

        _appointmentRepoMock.Verify(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WhenUserIsInactive_ThrowsBusinessException()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(14);
        var dto = new CreateAppointmentDto { UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = appointmentDate };

        var inactiveUser = CreateValidUser(1, isActive: false);
        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(inactiveUser);

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*Hesabı pasif olan müşteri için randevu oluşturulamaz*");

        _appointmentRepoMock.Verify(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // KABUL KRİTERİ 6: Başarılı randevu oluşturma testi
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenValidRequest_CreatesAppointmentAndSendsConfirmationEmail()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(11); // Yarın 11:00
        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            StartAt = appointmentDate,
            Notes = "Önemli randevu"
        };

        var user = CreateValidUser(1);
        var service = CreateValidService(1, 45);
        var employee = CreateValidEmployee(1, 1);

        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(dto.ServiceId, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(dto.EmployeeId, It.IsAny<CancellationToken>())).ReturnsAsync(employee);

        _appointmentRepoMock.Setup(a => a.HasConflictAsync(
            dto.EmployeeId,
            dto.StartAt,
            dto.StartAt.AddMinutes(45),
            null,
            It.IsAny<CancellationToken>())).ReturnsAsync(false);

        _appointmentRepoMock.Setup(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _sut.CreateAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(1);
        result.EmployeeId.Should().Be(1);
        result.ServiceId.Should().Be(1);
        result.StartAt.Should().Be(appointmentDate);
        result.EndAt.Should().Be(appointmentDate.AddMinutes(45));
        result.Status.Should().Be(AppointmentStatus.Confirmed);

        // Veritabanına kayıt çağrısı doğrulandı
        _appointmentRepoMock.Verify(a => a.AddAsync(It.Is<Appointment>(app =>
            app.UserId == 1 &&
            app.EmployeeId == 1 &&
            app.ServiceId == 1 &&
            app.StartAt == appointmentDate &&
            app.EndAt == appointmentDate.AddMinutes(45)), It.IsAny<CancellationToken>()), Times.Once);

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        // E-posta gönderimi tetiklendi
        _emailServiceMock.Verify(e => e.SendAppointmentConfirmationAsync(
            It.IsAny<AppointmentDto>(),
            user.Email,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // KABUL KRİTERİ 7: Yetkisiz/başkasına ait randevu işlemi için uygun business testi
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenCustomerAttemptsToBookForAnotherUser_ThrowsForbiddenException()
    {
        // Arrange: Kullanıcı 10, başkası (UserId 20) adına randevu oluşturmaya çalışıyor
        var dto = new CreateAppointmentDto
        {
            UserId = 20,
            EmployeeId = 1,
            ServiceId = 1,
            StartAt = _baseNow.Date.AddDays(1).AddHours(14)
        };

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto, requestingUserId: 10, isAdmin: false);

        // Assert
        var exception = await act.Should().ThrowAsync<ForbiddenException>();
        exception.WithMessage("*Başkası adına randevu oluşturma yetkiniz bulunmamaktadır*");

        _appointmentRepoMock.Verify(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RescheduleAsync_WhenCustomerAttemptsToEditAnotherUsersAppointment_ThrowsForbiddenException()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 50,
            UserId = 10, // Randevu Kullanıcı 10'a ait
            EmployeeId = 1,
            ServiceId = 1,
            Status = AppointmentStatus.Confirmed,
            Employee = CreateValidEmployee(1, 1),
            Service = CreateValidService(1, 30)
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        var updateDto = new UpdateAppointmentDto
        {
            StartAt = _baseNow.Date.AddDays(2).AddHours(12)
        };

        // Act: Kullanıcı 99 (farklı bir müşteri) güncellemeye çalışıyor
        Func<Task> act = async () => await _sut.RescheduleAsync(50, updateDto, requestingUserId: 99, isAdmin: false);

        // Assert
        var exception = await act.Should().ThrowAsync<ForbiddenException>();
        exception.WithMessage("*Yalnızca kendi randevunuzu yeniden zamanlayabilirsiniz*");

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CancelAsync_WhenCustomerAttemptsToCancelAnotherUsersAppointment_ThrowsForbiddenException()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 60,
            UserId = 10, // Randevu Kullanıcı 10'a ait
            Status = AppointmentStatus.Confirmed
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(60, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        // Act: Kullanıcı 99 iptal etmeye çalışıyor
        Func<Task> act = async () => await _sut.CancelAsync(60, requestingUserId: 99, isAdmin: false);

        // Assert
        var exception = await act.Should().ThrowAsync<ForbiddenException>();
        exception.WithMessage("*Yalnızca kendi randevunuzu iptal edebilirsiniz*");

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CancelAsync_WhenAdminCancelsAnotherUsersAppointment_Succeeds()
    {
        // Arrange
        var user = CreateValidUser(10);
        var appointment = new Appointment
        {
            Id = 70,
            UserId = 10,
            Status = AppointmentStatus.Confirmed,
            User = user,
            Employee = CreateValidEmployee(1, 1),
            Service = CreateValidService(1, 30)
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(70, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act: Admin kullanıcısı (requestingUserId: 999, isAdmin: true) başkasının randevusunu iptal ediyor
        await _sut.CancelAsync(70, requestingUserId: 999, isAdmin: true);

        // Assert
        appointment.Status.Should().Be(AppointmentStatus.Cancelled);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _emailServiceMock.Verify(e => e.SendAppointmentCancellationAsync(It.IsAny<AppointmentDto>(), user.Email, It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EK İŞ KURALI TESTLERİ: Yetkinlik, İzin Günü, Mesai Saati, Durum Kontrolleri
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenEmployeeCannotPerformService_ThrowsBusinessException()
    {
        // Arrange
        var appointmentDate = _baseNow.Date.AddDays(1).AddHours(11);
        var dto = new CreateAppointmentDto { UserId = 1, EmployeeId = 1, ServiceId = 99, StartAt = appointmentDate };

        var user = CreateValidUser(1);
        var service = CreateValidService(99);
        var employee = CreateValidEmployee(1, serviceId: 1); // Personel sadece Service 1'i yapabiliyor, 99'u değil

        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(dto.ServiceId, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(dto.EmployeeId, It.IsAny<CancellationToken>())).ReturnsAsync(employee);

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*hizmetini sunmamaktadır*");
    }

    [Fact]
    public async Task CreateAsync_WhenDateIsOnEmployeeOffDay_ThrowsBusinessException()
    {
        // Arrange: Pazar günü izinli bir personel için Pazar gününe randevu isteği
        var sunday = new DateTime(2026, 6, 14, 11, 0, 0, DateTimeKind.Utc); // Pazar günü
        var dto = new CreateAppointmentDto { UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = sunday };

        var user = CreateValidUser(1);
        var service = CreateValidService(1, 30);
        var employee = CreateValidEmployee(1, 1, offDay: DayOfWeek.Sunday);

        _userRepoMock.Setup(u => u.GetByIdAsync(dto.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdAsync(dto.ServiceId, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(dto.EmployeeId, It.IsAny<CancellationToken>())).ReturnsAsync(employee);

        // Act
        Func<Task> act = async () => await _sut.CreateAsync(dto);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*izinlidir*");
    }

    [Fact]
    public async Task CancelAsync_WhenAppointmentAlreadyCancelled_ThrowsBusinessException()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 80,
            UserId = 1,
            Status = AppointmentStatus.Cancelled
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(80, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        // Act
        Func<Task> act = async () => await _sut.CancelAsync(80);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*Bu randevu zaten iptal edilmiştir*");
    }

    [Fact]
    public async Task CancelAsync_WhenAppointmentCompleted_ThrowsBusinessException()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 81,
            UserId = 1,
            Status = AppointmentStatus.Completed
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(81, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        // Act
        Func<Task> act = async () => await _sut.CancelAsync(81);

        // Assert
        var exception = await act.Should().ThrowAsync<BusinessException>();
        exception.WithMessage("*Tamamlanmış bir randevu iptal edilemez*");
    }

    [Fact]
    public async Task RescheduleAsync_WhenSlotHasConflict_ThrowsConflictException()
    {
        // Arrange
        var employee = CreateValidEmployee(1, 1);
        var service = CreateValidService(1, 30);
        var appointment = new Appointment
        {
            Id = 90,
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            Status = AppointmentStatus.Confirmed,
            Employee = employee,
            Service = service
        };

        _appointmentRepoMock.Setup(a => a.GetByIdWithDetailsAsync(90, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        var newDate = _baseNow.Date.AddDays(1).AddHours(15);
        _appointmentRepoMock.Setup(a => a.HasConflictAsync(1, newDate, newDate.AddMinutes(30), 90, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var updateDto = new UpdateAppointmentDto { StartAt = newDate };

        // Act
        Func<Task> act = async () => await _sut.RescheduleAsync(90, updateDto);

        // Assert
        var exception = await act.Should().ThrowAsync<ConflictException>();
        exception.WithMessage("*başka bir randevusu bulunmaktadır*");
    }
}

