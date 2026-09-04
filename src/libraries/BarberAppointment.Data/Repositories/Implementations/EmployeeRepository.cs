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
        return await DbSet
            .AsNoTracking()
            .Where(e => e.IsActive && e.EmployeeServices.Any(es => es.ServiceId == serviceId && es.Service.IsActive))
            .Include(e => e.EmployeeServices)
                .ThenInclude(es => es.Service)
            .ToListAsync(cancellationToken);
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
