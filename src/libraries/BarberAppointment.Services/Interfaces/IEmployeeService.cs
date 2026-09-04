using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IEmployeeService
{
    Task<IReadOnlyList<EmployeeDto>> GetAllAsync(bool activeOnly = false, CancellationToken cancellationToken = default);
    Task<EmployeeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeDto>> GetByServiceIdAsync(int serviceId, CancellationToken cancellationToken = default);
    Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto, CancellationToken cancellationToken = default);
    Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task AssignServicesAsync(int employeeId, List<int> serviceIds, CancellationToken cancellationToken = default);
}
