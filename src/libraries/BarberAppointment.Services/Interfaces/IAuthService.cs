using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<UserProfileDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    Task<ChangePasswordResponseDto> ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task ConfirmPasswordChangeAsync(int userId, ConfirmPasswordChangeDto dto, CancellationToken cancellationToken = default);
    Task<EmailVerificationResponseDto> VerifyEmailAsync(VerifyEmailDto dto, CancellationToken cancellationToken = default);
    Task<EmailVerificationResponseDto> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<ForgotPasswordResponseDto> ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default);
}
