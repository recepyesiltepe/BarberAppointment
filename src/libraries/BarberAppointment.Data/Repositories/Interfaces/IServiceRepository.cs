using BarberAppointment.Domain.Entities;

namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IServiceRepository : IRepository<Service>
{
    Task<IReadOnlyList<Service>> GetActiveServicesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Service>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);
    Task<bool> HasAppointmentsAsync(int serviceId, CancellationToken cancellationToken = default);
    Task DeleteServiceWithRelationsAsync(int serviceId, CancellationToken cancellationToken = default);
}
