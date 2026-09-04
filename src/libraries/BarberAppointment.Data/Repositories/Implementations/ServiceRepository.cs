using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Repositories.Implementations;

public class ServiceRepository : Repository<Service>, IServiceRepository
{
    public ServiceRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Service>> GetActiveServicesAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Service>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids.ToList();
        return await DbSet
            .AsNoTracking()
            .Where(s => idList.Contains(s.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasAppointmentsAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        return await Context.Appointments
            .AnyAsync(a => a.ServiceId == serviceId, cancellationToken);
    }

    public async Task DeleteServiceWithRelationsAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        // 1. EmployeeServices ara tablosundaki bağlantıları temizle
        var employeeServices = await Context.EmployeeServices
            .Where(es => es.ServiceId == serviceId)
            .ToListAsync(cancellationToken);

        if (employeeServices.Any())
        {
            Context.EmployeeServices.RemoveRange(employeeServices);
        }

        // 2. Hizmeti sil
        var service = await DbSet.FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);
        if (service != null)
        {
            DbSet.Remove(service);
        }
    }
}
