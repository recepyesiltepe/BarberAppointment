using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Repositories.Implementations;

public class EmployeeRepository : Repository<Employee>, IEmployeeRepository
{
    public EmployeeRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Employee>> GetEmployeesWithServicesAsync(bool activeOnly = false, CancellationToken cancellationToken = default)
    {
        IQueryable<Employee> query = DbSet
            .AsNoTracking()
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .Include(e => e.User);

        if (activeOnly)
        {
            query = query.Where(e => e.IsActive);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<Employee?> GetByIdWithServicesAsync(int id, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Employee>> GetEmployeesByServiceIdAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        var service = await Context.Services
            .Include(s => s.SubServiceItems)
            .FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);

        if (service == null || !service.IsActive)
            return Array.Empty<Employee>();

        if (service.IsComposite && service.SubServiceItems.Any())
        {
            var subServiceIds = service.SubServiceItems.Select(csi => csi.SubServiceId).ToList();

            // Personel: Doğrudan kompozit hizmete atanmış VEYA kompozit hizmeti oluşturan tüm alt hizmetleri verebiliyor olmalı
            return await DbSet
                .AsNoTracking()
                .Where(e => e.IsActive && (
                    e.EmployeeServices.Any(es => es.ServiceId == serviceId && es.Service.IsActive) ||
                    subServiceIds.All(subId => e.EmployeeServices.Any(es => es.ServiceId == subId && es.Service.IsActive))
                ))
                .Include(e => e.EmployeeServices)
                    .ThenInclude(es => es.Service)
                .ToListAsync(cancellationToken);
        }

        return await DbSet
            .AsNoTracking()
            .Where(e => e.IsActive && e.EmployeeServices.Any(es => es.ServiceId == serviceId && es.Service.IsActive))
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Employee>> GetEmployeesByMultipleServiceIdsAsync(IEnumerable<int> serviceIds, CancellationToken cancellationToken = default)
    {
        var ids = serviceIds.Distinct().ToList();
        if (!ids.Any())
            return Array.Empty<Employee>();

        var services = await Context.Services
            .Include(s => s.SubServiceItems)
            .Where(s => ids.Contains(s.Id) && s.IsActive)
            .ToListAsync(cancellationToken);

        // İstenen hizmetlerden herhangi biri aktif değilse veya bulunamadıysa uygun kuaför olamaz
        if (services.Count != ids.Count)
            return Array.Empty<Employee>();

        var activeEmployees = await DbSet
            .AsNoTracking()
            .Where(e => e.IsActive)
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .ToListAsync(cancellationToken);

        var qualifiedEmployees = activeEmployees.Where(emp =>
        {
            var empServiceIds = emp.EmployeeServices
                .Where(es => es.Service != null && es.Service.IsActive)
                .Select(es => es.ServiceId)
                .ToHashSet();

            return services.All(srv =>
            {
                if (srv.IsComposite && srv.SubServiceItems.Any())
                {
                    var subIds = srv.SubServiceItems.Select(csi => csi.SubServiceId).ToList();
                    return empServiceIds.Contains(srv.Id) || subIds.All(subId => empServiceIds.Contains(subId));
                }

                return empServiceIds.Contains(srv.Id);
            });
        }).ToList();

        return qualifiedEmployees;
    }

    public async Task UpdateEmployeeServicesAsync(int employeeId, IEnumerable<int> serviceIds, CancellationToken cancellationToken = default)
    {
        var existingRelations = await Context.EmployeeServices
            .Where(es => es.EmployeeId == employeeId)
            .ToListAsync(cancellationToken);

        Context.EmployeeServices.RemoveRange(existingRelations);

        var distinctIds = serviceIds.Distinct();
        foreach (var sId in distinctIds)
        {
            await Context.EmployeeServices.AddAsync(new EmployeeService
            {
                EmployeeId = employeeId,
                ServiceId = sId
            }, cancellationToken);
        }
    }
}
