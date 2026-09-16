using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Security;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BarberAppointment.UnitTests.Services;

public class AuthProfileOtpTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly Mock<IJwtTokenService> _jwtTokenServiceMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<ISmsVerificationService> _smsVerificationServiceMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly AuthService _authService;

    public AuthProfileOtpTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _userRepoMock = new Mock<IUserRepository>();
        _passwordHasherMock = new Mock<IPasswordHasher>();
        _jwtTokenServiceMock = new Mock<IJwtTokenService>();
        _emailServiceMock = new Mock<IEmailService>();
        _smsVerificationServiceMock = new Mock<ISmsVerificationService>();
        _loggerMock = new Mock<ILogger<AuthService>>();

        _unitOfWorkMock.Setup(u => u.Users).Returns(_userRepoMock.Object);

        _authService = new AuthService(
            _unitOfWorkMock.Object,
            _passwordHasherMock.Object,
            _jwtTokenServiceMock.Object,
            _emailServiceMock.Object,
            _smsVerificationServiceMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenOtpCodeIsMissingOrEmpty_ThrowsBusinessException()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FullName = "Ali Veli",
            Email = "ali@test.com",
            Phone = "05551112233",
            IsActive = true,
            Role = UserRole.Customer
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var dto = new UpdateProfileDto
        {
            FullName = "Ali Yeni",
            Phone = "05551112233",
            OtpCode = ""
        };

        // Act
        var act = async () => await _authService.UpdateProfileAsync(1, dto);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*OTP doğrulama kodunu girmeniz zorunludur*");
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenOtpCodeIsInvalid_ThrowsBusinessException()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FullName = "Ali Veli",
            Email = "ali@test.com",
            Phone = "05551112233",
            IsActive = true,
            Role = UserRole.Customer
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        _smsVerificationServiceMock
            .Setup(s => s.VerifyCodeAsync("05551112233", "999999", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SmsVerificationResultDto.Failed("Doğrulama kodu hatalı. Kalan deneme hakkı: 2"));

        var dto = new UpdateProfileDto
        {
            FullName = "Ali Yeni",
            Phone = "05551112233",
            OtpCode = "999999"
        };

        // Act
        var act = async () => await _authService.UpdateProfileAsync(1, dto);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*Doğrulama kodu hatalı*");

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenOtpCodeIsValid_UpdatesProfileSuccessfully()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FullName = "Ali Veli",
            Email = "ali@test.com",
            Phone = "05551112233",
            IsActive = true,
            IsPhoneVerified = false,
            Role = UserRole.Customer
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        _smsVerificationServiceMock
            .Setup(s => s.VerifyCodeAsync("05559998877", "123456", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SmsVerificationResultDto.Verified("0555***8877", DateTime.UtcNow));

        var dto = new UpdateProfileDto
        {
            FullName = "Ali Güncellendi",
            Phone = "0555 999 88 77",
            OtpCode = "123456"
        };

        // Act
        var result = await _authService.UpdateProfileAsync(1, dto);

        // Assert
        result.FullName.Should().Be("Ali Güncellendi");
        result.Phone.Should().Be("05559998877");
        result.IsPhoneVerified.Should().BeTrue();
        user.FullName.Should().Be("Ali Güncellendi");
        user.Phone.Should().Be("05559998877");
        user.IsPhoneVerified.Should().BeTrue();

        _unitOfWorkMock.Verify(u => u.Users.Update(user), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendProfileOtpAsync_DelegatesToSmsVerificationService_WhenFullNameChanged()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FullName = "Ali Veli",
            Email = "ali@test.com",
            Phone = "05551112233",
            IsActive = true,
            Role = UserRole.Customer
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        _smsVerificationServiceMock
            .Setup(s => s.SendCodeAsync("05551112233", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SmsVerificationResultDto.Sent("0555***2233", DateTime.UtcNow.AddMinutes(5), 300, 60, "123456"));

        // Act
        var result = await _authService.SendProfileOtpAsync(1, "Ali Veli Güncellendi", null);

        // Assert
        result.Success.Should().BeTrue();
        result.SimulationCode.Should().Be("123456");
        _smsVerificationServiceMock.Verify(s => s.SendCodeAsync("05551112233", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendProfileOtpAsync_WhenNoChanges_ThrowsBusinessException()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FullName = "Ali Veli",
            Email = "ali@test.com",
            Phone = "05551112233",
            IsActive = true,
            Role = UserRole.Customer
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act & Assert
        var act = () => _authService.SendProfileOtpAsync(1, "Ali Veli", "0555 111 22 33");
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*değişiklik yapılmadığı için onay kodu talep edilemez*");
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenNoChanges_ThrowsBusinessException()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FullName = "Ali Veli",
            Email = "ali@test.com",
            Phone = "05551112233",
            IsActive = true,
            Role = UserRole.Customer
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var dto = new UpdateProfileDto
        {
            FullName = "Ali Veli",
            Phone = "0555 111 22 33",
            OtpCode = "123456"
        };

        // Act & Assert
        var act = () => _authService.UpdateProfileAsync(1, dto);
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*değişiklik bulunmamaktadır*");
    }

    [Fact]
    public async Task RegisterAsync_WhenEmailAlreadyExists_ThrowsConflictException()
    {
        // Arrange
        var existingUser = new User
        {
            Id = 1,
            FullName = "Mevcut Kullanıcı",
            Email = "varolan@test.com",
            Phone = "05551112233"
        };
        _userRepoMock.Setup(r => r.GetByEmailAsync("varolan@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        var dto = new RegisterDto
        {
            FullName = "Yeni Kullanıcı",
            Email = "varolan@test.com",
            Phone = "05559998877",
            Password = "Password123!",
            ConfirmPassword = "Password123!"
        };

        // Act & Assert
        var act = () => _authService.RegisterAsync(dto);
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*zaten kayıtlı bir kullanıcı bulunmaktadır*");
    }

    [Fact]
    public async Task RegisterAsync_WhenPhoneAlreadyExists_ThrowsConflictException()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByEmailAsync("yeni@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var existingUserWithPhone = new User
        {
            Id = 2,
            FullName = "Mevcut Telefon Sahibi",
            Email = "diger@test.com",
            Phone = "05551112233"
        };
        _userRepoMock.Setup(r => r.GetByPhoneAsync("05551112233", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUserWithPhone);

        var dto = new RegisterDto
        {
            FullName = "Yeni Kullanıcı",
            Email = "yeni@test.com",
            Phone = "05551112233",
            Password = "Password123!",
            ConfirmPassword = "Password123!"
        };

        // Act & Assert
        var act = () => _authService.RegisterAsync(dto);
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*telefon numarası ile zaten kayıtlı bir kullanıcı bulunmaktadır*");
    }

    [Fact]
    public async Task SendProfileOtpAsync_WhenNewPhoneAlreadyBelongsToAnotherUser_ThrowsConflictException()
    {
        // Arrange
        var currentUser = new User
        {
            Id = 1,
            FullName = "Ahmet Yılmaz",
            Email = "ahmet@test.com",
            Phone = "05551111111"
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(currentUser);

        var otherUser = new User
        {
            Id = 2,
            FullName = "Mehmet Demir",
            Email = "mehmet@test.com",
            Phone = "05552222222"
        };
        _userRepoMock.Setup(r => r.GetByPhoneAsync("05552222222", It.IsAny<CancellationToken>()))
            .ReturnsAsync(otherUser);

        // Act & Assert
        var act = () => _authService.SendProfileOtpAsync(1, "Ahmet Yılmaz", "0555 222 22 22");
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*Bu telefon numarası başka bir kullanıcı tarafından kullanılmaktadır*");
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenNewPhoneAlreadyBelongsToAnotherUser_ThrowsConflictException()
    {
        // Arrange
        var currentUser = new User
        {
            Id = 1,
            FullName = "Ahmet Yılmaz",
            Email = "ahmet@test.com",
            Phone = "05551111111"
        };
        _userRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(currentUser);

        var otherUser = new User
        {
            Id = 2,
            FullName = "Mehmet Demir",
            Email = "mehmet@test.com",
            Phone = "05552222222"
        };
        _userRepoMock.Setup(r => r.GetByPhoneAsync("05552222222", It.IsAny<CancellationToken>()))
            .ReturnsAsync(otherUser);

        var dto = new UpdateProfileDto
        {
            FullName = "Ahmet Yılmaz",
            Phone = "0555 222 22 22",
            OtpCode = "123456"
        };

        // Act & Assert
        var act = () => _authService.UpdateProfileAsync(1, dto);
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*Bu telefon numarası başka bir kullanıcı tarafından kullanılmaktadır*");
    }
}

