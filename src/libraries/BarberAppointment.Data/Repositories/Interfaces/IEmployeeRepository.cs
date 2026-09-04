using BarberAppointment.Domain.Entities;

namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IEmployeeRepository : IRepository<Employee>
{
    Task<IReadOnlyList<Employee>> GetEmployeesWithServicesAsync(bool activeOnly = false, CancellationToken cancellationToken = default);
    Task<Employee?> GetByIdWithServicesAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Employee>> GetEmployeesByServiceIdAsync(int serviceId, CancellationToken cancellationToken = default);
    Task UpdateEmployeeServicesAsync(int employeeId, IEnumerable<int> serviceIds, CancellationToken cancellationToken = default);
}
