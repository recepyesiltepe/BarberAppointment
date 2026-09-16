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
}

