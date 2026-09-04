using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IServiceManagementService
{
    Task<IReadOnlyList<ServiceDto>> GetAllAsync(bool activeOnly = false, CancellationToken cancellationToken = default);
    Task<ServiceDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ServiceDto> CreateAsync(CreateServiceDto dto, CancellationToken cancellationToken = default);
    Task<ServiceDto> UpdateAsync(int id, UpdateServiceDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
