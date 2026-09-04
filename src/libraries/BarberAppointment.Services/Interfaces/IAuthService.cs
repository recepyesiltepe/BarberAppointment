using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<UserProfileDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
}
