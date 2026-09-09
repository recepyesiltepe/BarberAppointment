using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;
using BarberAppointment.Services.Security;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using EmployeeServiceEntity = BarberAppointment.Domain.Entities.EmployeeService;

namespace BarberAppointment.UnitTests.Services;

public class LoggingTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IEmployeeRepository> _employeeRepoMock;
    private readonly Mock<IServiceRepository> _serviceRepoMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly Mock<IJwtTokenService> _jwtTokenServiceMock;
    private readonly IWorkHoursPolicy _workHoursPolicy;

    private readonly Mock<ILogger<AppointmentService>> _appointmentLoggerMock;
    private readonly Mock<ILogger<AuthService>> _authLoggerMock;

    private readonly DateTime _baseNow = new(2026, 6, 10, 8, 0, 0, DateTimeKind.Utc);

    public LoggingTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _appointmentRepoMock = new Mock<IAppointmentRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _employeeRepoMock = new Mock<IEmployeeRepository>();
        _serviceRepoMock = new Mock<IServiceRepository>();
        _dateTimeProviderMock = new Mock<IDateTimeProvider>();
        _emailServiceMock = new Mock<IEmailService>();
        _passwordHasherMock = new Mock<IPasswordHasher>();
        _jwtTokenServiceMock = new Mock<IJwtTokenService>();

        _appointmentLoggerMock = new Mock<ILogger<AppointmentService>>();
        _authLoggerMock = new Mock<ILogger<AuthService>>();

        _unitOfWorkMock.Setup(u => u.Appointments).Returns(_appointmentRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Users).Returns(_userRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Employees).Returns(_employeeRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Services).Returns(_serviceRepoMock.Object);

        _dateTimeProviderMock.Setup(d => d.UtcNow).Returns(_baseNow);
        _dateTimeProviderMock.Setup(d => d.Today).Returns(_baseNow.Date);

        _workHoursPolicy = new DefaultWorkHoursPolicy();
    }

    [Fact]
    public async Task AppointmentService_CreateAsync_Success_LogsInformation()
    {
        // Arrange
        var user = new User { Id = 1, FullName = "Ali Yılmaz", Email = "ali@test.com", IsActive = true, Role = UserRole.Customer };
        var service = new Service { Id = 10, Name = "Saç Kesimi", DurationMinutes = 30, IsActive = true };
        var employee = new Employee
        {
            Id = 5,
            FullName = "Ahmet Berber",
            IsActive = true,
            EmployeeServices = new List<EmployeeServiceEntity>
            {
                new() { EmployeeId = 5, ServiceId = 10 }
            }
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(r => r.GetByIdWithServicesAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _appointmentRepoMock.Setup(r => r.HasConflictAsync(5, It.IsAny<DateTime>(), It.IsAny<DateTime>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var sut = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object,
            _appointmentLoggerMock.Object);

        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 5,
            ServiceId = 10,
            StartAt = new DateTime(2026, 6, 10, 10, 0, 0, DateTimeKind.Utc)
        };

        // Act
        var result = await sut.CreateAsync(dto, requestingUserId: 1, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        _appointmentLoggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Randevu başarıyla oluşturuldu")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task AppointmentService_CreateAsync_Conflict_LogsWarning()
    {
        // Arrange
        var user = new User { Id = 1, FullName = "Ali Yılmaz", Email = "ali@test.com", IsActive = true, Role = UserRole.Customer };
        var service = new Service { Id = 10, Name = "Saç Kesimi", DurationMinutes = 30, IsActive = true };
        var employee = new Employee
        {
            Id = 5,
            FullName = "Ahmet Berber",
            IsActive = true,
            EmployeeServices = new List<EmployeeServiceEntity>
            {
                new() { EmployeeId = 5, ServiceId = 10 }
            }
        };

        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _serviceRepoMock.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _employeeRepoMock.Setup(r => r.GetByIdWithServicesAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(employee);
        _appointmentRepoMock.Setup(r => r.HasConflictAsync(5, It.IsAny<DateTime>(), It.IsAny<DateTime>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var sut = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object,
            _appointmentLoggerMock.Object);

        var dto = new CreateAppointmentDto
        {
            UserId = 1,
            EmployeeId = 5,
            ServiceId = 10,
            StartAt = new DateTime(2026, 6, 10, 10, 0, 0, DateTimeKind.Utc)
        };

        // Act & Assert
        await Assert.ThrowsAsync<ConflictException>(() => sut.CreateAsync(dto, requestingUserId: 1, isAdmin: false));

        _appointmentLoggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Randevu çakışması tespit edildi")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task AppointmentService_CreateAsync_Unauthorized_LogsWarning()
    {
        // Arrange
        var sut = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object,
            _appointmentLoggerMock.Object);

        var dto = new CreateAppointmentDto
        {
            UserId = 2,
            EmployeeId = 5,
            ServiceId = 10,
            StartAt = new DateTime(2026, 6, 10, 10, 0, 0, DateTimeKind.Utc)
        };

        // Act & Assert (User 1 tries to create appointment for User 2 without admin rights)
        await Assert.ThrowsAsync<ForbiddenException>(() => sut.CreateAsync(dto, requestingUserId: 1, isAdmin: false));

        _appointmentLoggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Randevu oluşturma engellendi")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task AuthService_LoginAsync_FailedPassword_LogsWarning_AndNeverLogsPassword()
    {
        // Arrange
        const string plainPassword = "SuperSecretPassword123!";
        var user = new User
        {
            Id = 1,
            FullName = "Mehmet Kaya",
            Email = "mehmet@test.com",
            IsActive = true,
            IsEmailVerified = true,
            PasswordHash = new byte[] { 1, 2, 3 },
            PasswordSalt = new byte[] { 4, 5, 6 }
        };

        _unitOfWorkMock.Setup(u => u.Users.GetByEmailAsync("mehmet@test.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasherMock.Setup(h => h.VerifyPasswordHash(plainPassword, user.PasswordHash, user.PasswordSalt)).Returns(false);

        var sut = new AuthService(
            _unitOfWorkMock.Object,
            _passwordHasherMock.Object,
            _jwtTokenServiceMock.Object,
            _emailServiceMock.Object,
            _authLoggerMock.Object);

        var dto = new LoginDto
        {
            Email = "mehmet@test.com",
            Password = plainPassword
        };

        // Act
        var act = async () => await sut.LoginAsync(dto);
        await act.Should().ThrowAsync<BusinessException>();

        // Assert: Warning logged
        _authLoggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Başarısız giriş denemesi: Hatalı şifre")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);

        // Assert: Plain password NEVER logged in any log call
        _authLoggerMock.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(plainPassword)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }

    [Fact]
    public async Task AuthService_LoginAsync_Success_LogsInformation_AndNeverLogsTokens()
    {
        // Arrange
        const string plainPassword = "CorrectPassword123!";
        const string jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload";
        const string refreshToken = "refresh-uuid-token-xyz-123";

        var user = new User
        {
            Id = 1,
            FullName = "Mehmet Kaya",
            Email = "mehmet@test.com",
            IsActive = true,
            IsEmailVerified = true,
            Role = UserRole.Customer,
            PasswordHash = new byte[] { 1, 2, 3 },
            PasswordSalt = new byte[] { 4, 5, 6 }
        };

        _unitOfWorkMock.Setup(u => u.Users.GetByEmailAsync("mehmet@test.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasherMock.Setup(h => h.VerifyPasswordHash(plainPassword, user.PasswordHash, user.PasswordSalt)).Returns(true);
        _jwtTokenServiceMock.Setup(j => j.GenerateToken(user, null)).Returns(jwtToken);
        _jwtTokenServiceMock.Setup(j => j.GetExpirationSeconds()).Returns(3600);
        _jwtTokenServiceMock.Setup(j => j.GenerateRefreshToken()).Returns(refreshToken);
        _jwtTokenServiceMock.Setup(j => j.GetRefreshTokenExpirationDays()).Returns(7);

        var sut = new AuthService(
            _unitOfWorkMock.Object,
            _passwordHasherMock.Object,
            _jwtTokenServiceMock.Object,
            _emailServiceMock.Object,
            _authLoggerMock.Object);

        var dto = new LoginDto
        {
            Email = "mehmet@test.com",
            Password = plainPassword
        };

        // Act
        var result = await sut.LoginAsync(dto);

        // Assert: Result contains token
        result.AccessToken.Should().Be(jwtToken);

        // Assert: LogInformation was called for successful login
        _authLoggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Kullanıcı başarıyla giriş yaptı")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);

        // Assert: Tokens NEVER leaked in logger
        _authLoggerMock.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(jwtToken) || v.ToString()!.Contains(refreshToken)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }
}

