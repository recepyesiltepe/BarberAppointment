using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<UserDto?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken cancellationToken = default);
    Task SetActiveStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
}
