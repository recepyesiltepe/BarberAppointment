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

    public override async Task<Service?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(s => s.SubServiceItems.OrderBy(csi => csi.Order))
                .ThenInclude(csi => csi.SubService)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public override async Task<IReadOnlyList<Service>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(s => s.SubServiceItems.OrderBy(csi => csi.Order))
                .ThenInclude(csi => csi.SubService)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Service>> GetActiveServicesAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(s => s.IsActive)
            .Include(s => s.SubServiceItems.OrderBy(csi => csi.Order))
                .ThenInclude(csi => csi.SubService)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Service>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids.ToList();
        return await DbSet
            .AsNoTracking()
            .Where(s => idList.Contains(s.Id))
            .Include(s => s.SubServiceItems.OrderBy(csi => csi.Order))
                .ThenInclude(csi => csi.SubService)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasAppointmentsAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        return await Context.Appointments
            .AnyAsync(a => a.ServiceId == serviceId, cancellationToken);
    }

    public async Task<bool> IsPartOfCompositeServiceAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        return await Context.CompositeServiceItems
            .AnyAsync(csi => csi.SubServiceId == serviceId && csi.CompositeService.IsActive, cancellationToken);
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

        // 2. Bu hizmetin kompozit alt hizmet bağlantılarını temizle (CompositeServiceItems)
        var compositeItems = await Context.CompositeServiceItems
            .Where(csi => csi.CompositeServiceId == serviceId || csi.SubServiceId == serviceId)
            .ToListAsync(cancellationToken);

        if (compositeItems.Any())
        {
            Context.CompositeServiceItems.RemoveRange(compositeItems);
        }

        // 3. Hizmeti sil
        var service = await DbSet.FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);
        if (service != null)
        {
            DbSet.Remove(service);
        }
    }
}
