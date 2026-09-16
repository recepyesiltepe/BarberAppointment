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

public class MultiServiceAppointmentTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IEmployeeRepository> _employeeRepoMock;
    private readonly Mock<IServiceRepository> _serviceRepoMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly IWorkHoursPolicy _workHoursPolicy;

    private readonly AppointmentService _sut;
    private readonly DateTime _baseNow = new(2026, 6, 10, 8, 0, 0, DateTimeKind.Utc); // Wednesday 08:00 UTC (11:00 Turkey)

    public MultiServiceAppointmentTests()
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
        var turkeyNow = _baseNow.AddHours(3);
        _dateTimeProviderMock.Setup(d => d.TurkeyNow).Returns(turkeyNow);
        _dateTimeProviderMock.Setup(d => d.TurkeyToday).Returns(turkeyNow.Date);
        _dateTimeProviderMock.Setup(d => d.ToTurkeyTime(It.IsAny<DateTime>()))
            .Returns<DateTime>(dt => dt.Kind == DateTimeKind.Utc ? dt.AddHours(3) : dt);
        _dateTimeProviderMock.Setup(d => d.IsInPast(It.IsAny<DateTime>()))
            .Returns<DateTime>(dt => (dt.Kind == DateTimeKind.Utc ? dt.AddHours(3) : dt) <= turkeyNow);

        _workHoursPolicy = new DefaultWorkHoursPolicy();

        _sut = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object);
    }

    [Fact]
    public async Task CreateAsync_WhenMultipleServicesSelected_CalculatesTotalDurationAndPrice()
    {
        // Arrange
        var user = new User { Id = 1, FullName = "Test Müşteri", IsActive = true };
        var s1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 250, IsActive = true, IsComposite = false };
        var s2 = new Service { Id = 2, Name = "Sakal Tıraşı", DurationMinutes = 20, Price = 150, IsActive = true, IsComposite = false };

        var employee = new Employee
        {
            Id = 1,
            FullName = "Ahmet Usta",
            IsActive = true,
            WorkStartTime = new TimeSpan(9, 0, 0),
            WorkEndTime = new TimeSpan(19, 0, 0),
            WeeklyOffDay = DayOfWeek.Sunday
        };
        employee.EmployeeServices.Add(new EmployeeServiceEntity { EmployeeId = 1, ServiceId = 1, Service = s1 });
        employee.EmployeeServices.Add(new EmployeeServiceEntity { EmployeeId = 1, ServiceId = 2, Service = s2 });

        _userRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _serviceRepoMock.Setup(s => s.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { s1, s2 });
        _appointmentRepoMock.Setup(a => a.HasConflictAsync(1, It.IsAny<DateTime>(), It.IsAny<DateTime>(), null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        Appointment? saved = null;
        _appointmentRepoMock.Setup(a => a.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()))
            .Callback<Appointment, CancellationToken>((app, _) => saved = app)
            .Returns(Task.CompletedTask);

        var startAt = new DateTime(2026, 6, 10, 14, 0, 0); // 14:00
        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            ServiceIds = new List<int> { 1, 2 },
            StartAt = startAt
        };

        // Act
        var result = await _sut.CreateAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result.Price.Should().Be(400); // 250 + 150
        result.DurationMinutes.Should().Be(50); // 30 + 20
        result.EndAt.Should().Be(startAt.AddMinutes(50)); // 14:50
        result.Services.Should().HaveCount(2);

        saved.Should().NotBeNull();
        saved!.AppointmentServices.Should().HaveCount(2);
        saved.EndAt.Should().Be(startAt.AddMinutes(50));
    }

    [Fact]
    public async Task CreateAsync_WhenCompositeAndSubServiceBothSelected_ThrowsBusinessException()
    {
        // Arrange
        var user = new User { Id = 1, FullName = "Test Müşteri", IsActive = true };
        var sub1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 250, IsActive = true, IsComposite = false };
        var sub2 = new Service { Id = 2, Name = "Sakal Tıraşı", DurationMinutes = 20, Price = 150, IsActive = true, IsComposite = false };
        var composite = new Service { Id = 10, Name = "Saç + Sakal Paketi", DurationMinutes = 50, Price = 350, IsActive = true, IsComposite = true };
        composite.SubServiceItems.Add(new CompositeServiceItem { CompositeServiceId = 10, SubServiceId = 1, SubService = sub1 });
        composite.SubServiceItems.Add(new CompositeServiceItem { CompositeServiceId = 10, SubServiceId = 2, SubService = sub2 });

        _userRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(s => s.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { composite, sub1 }); // Hem paket hem alt hizmet seçilmiş!

        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 10,
            ServiceIds = new List<int> { 10, 1 },
            StartAt = new DateTime(2026, 6, 10, 14, 0, 0)
        };

        // Act
        var act = () => _sut.CreateAsync(dto);

        // Assert
        var ex = await act.Should().ThrowAsync<BusinessException>();
        ex.WithMessage("*içeriğinde zaten yer alan*ayrıca seçilemez*");
    }

    [Fact]
    public async Task CreateAsync_WhenEmployeeLacksOneOfSelectedServices_ThrowsBusinessException()
    {
        // Arrange
        var user = new User { Id = 1, FullName = "Test Müşteri", IsActive = true };
        var s1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 250, IsActive = true, IsComposite = false };
        var s2 = new Service { Id = 2, Name = "Cilt Bakımı", DurationMinutes = 40, Price = 300, IsActive = true, IsComposite = false };

        var employee = new Employee
        {
            Id = 1,
            FullName = "Mehmet Usta",
            IsActive = true,
            WorkStartTime = new TimeSpan(9, 0, 0),
            WorkEndTime = new TimeSpan(19, 0, 0)
        };
        // Personel sadece Saç Kesimi (1) hizmetini sunabiliyor, Cilt Bakımı (2) yok!
        employee.EmployeeServices.Add(new EmployeeServiceEntity { EmployeeId = 1, ServiceId = 1, Service = s1 });

        _userRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _serviceRepoMock.Setup(s => s.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { s1, s2 });

        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            ServiceIds = new List<int> { 1, 2 },
            StartAt = new DateTime(2026, 6, 10, 14, 0, 0)
        };

        // Act
        var act = () => _sut.CreateAsync(dto);

        // Assert
        var ex = await act.Should().ThrowAsync<BusinessException>();
        ex.WithMessage("*hizmetini sunmamaktadır*");
    }

    [Fact]
    public async Task CreateAsync_WhenTotalDurationCausesTimeConflict_ThrowsConflictException()
    {
        // Arrange
        var user = new User { Id = 1, FullName = "Test Müşteri", IsActive = true };
        var s1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 250, IsActive = true, IsComposite = false };
        var s2 = new Service { Id = 2, Name = "Sakal Tıraşı", DurationMinutes = 30, Price = 150, IsActive = true, IsComposite = false };

        var employee = new Employee
        {
            Id = 1,
            FullName = "Ahmet Usta",
            IsActive = true,
            WorkStartTime = new TimeSpan(9, 0, 0),
            WorkEndTime = new TimeSpan(19, 0, 0)
        };
        employee.EmployeeServices.Add(new EmployeeServiceEntity { EmployeeId = 1, ServiceId = 1, Service = s1 });
        employee.EmployeeServices.Add(new EmployeeServiceEntity { EmployeeId = 1, ServiceId = 2, Service = s2 });

        _userRepoMock.Setup(u => u.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _serviceRepoMock.Setup(s => s.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { s1, s2 });

        // Total 60 dakika: 14:00 - 15:00 arasında çakışma var!
        _appointmentRepoMock.Setup(a => a.HasConflictAsync(1, new DateTime(2026, 6, 10, 14, 0, 0), new DateTime(2026, 6, 10, 15, 0, 0), null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 1,
            ServiceId = 1,
            ServiceIds = new List<int> { 1, 2 },
            StartAt = new DateTime(2026, 6, 10, 14, 0, 0)
        };

        // Act
        var act = () => _sut.CreateAsync(dto);

        // Assert
        var ex = await act.Should().ThrowAsync<ConflictException>();
        ex.WithMessage("*başka bir randevusu bulunmaktadır*");
    }

    [Fact]
    public async Task GetAvailableSlotsAsync_WithMultipleServices_CalculatesSlotsForTotalDuration()
    {
        // Arrange
        var employee = new Employee
        {
            Id = 1,
            FullName = "Ahmet Usta",
            IsActive = true,
            WorkStartTime = new TimeSpan(9, 0, 0),
            WorkEndTime = new TimeSpan(12, 0, 0) // 3 saat mesai (09:00 - 12:00)
        };
        var s1 = new Service { Id = 1, Name = "Saç", DurationMinutes = 45, IsActive = true };
        var s2 = new Service { Id = 2, Name = "Sakal", DurationMinutes = 45, IsActive = true };
        // Toplam süre = 90 dakika (1.5 saat)

        _employeeRepoMock.Setup(e => e.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _serviceRepoMock.Setup(s => s.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { s1, s2 });
        _appointmentRepoMock.Setup(a => a.GetByEmployeeAndDateRangeAsync(1, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Appointment>());

        var query = new AvailableSlotsQueryDto
        {
            EmployeeId = 1,
            ServiceId = 1,
            ServiceIds = new List<int> { 1, 2 },
            Date = new DateTime(2026, 6, 11) // İleri bir tarih (yarın)
        };

        // Act
        var result = await _sut.GetAvailableSlotsAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.Should().OnlyContain(s => s.DurationMinutes == 90);
        // 09:00 - 10:30, 09:30 - 11:00, 10:00 - 11:30, 10:30 - 12:00 (Hepsi 12:00 mesai sonuna sığar)
        result.Should().NotBeEmpty();
        result.First().DurationMinutes.Should().Be(90);
        result.First().EndAt.Should().Be(result.First().StartAt.AddMinutes(90));
    }
}
