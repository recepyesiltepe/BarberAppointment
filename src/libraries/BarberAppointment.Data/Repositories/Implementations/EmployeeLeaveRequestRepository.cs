using BarberAppointment.Core.Enums;
using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Repositories.Implementations;

public class EmployeeLeaveRequestRepository : Repository<EmployeeLeaveRequest>, IEmployeeLeaveRequestRepository
{
    public EmployeeLeaveRequestRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<EmployeeLeaveRequest?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(x => x.Employee)
            .Include(x => x.ReviewedByUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<EmployeeLeaveRequest>> GetByEmployeeIdAsync(int employeeId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.ReviewedByUser)
            .Where(x => x.EmployeeId == employeeId)
            .OrderByDescending(x => x.StartDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EmployeeLeaveRequest>> GetApprovedLeavesInRangeAsync(int employeeId, DateTime start, DateTime end, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(x => x.EmployeeId == employeeId &&
                        x.Status == LeaveRequestStatus.Approved &&
                        x.StartDate < end &&
                        x.EndDate > start)
            .OrderBy(x => x.StartDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasApprovedLeaveConflictAsync(int employeeId, DateTime start, DateTime end, int? excludeLeaveId = null, CancellationToken cancellationToken = default)
    {
        var query = DbSet
            .AsNoTracking()
            .Where(x => x.EmployeeId == employeeId &&
                        x.Status == LeaveRequestStatus.Approved &&
                        x.StartDate < end &&
                        x.EndDate > start);

        if (excludeLeaveId.HasValue)
        {
            query = query.Where(x => x.Id != excludeLeaveId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EmployeeLeaveRequest>> GetFilteredAsync(
        int? employeeId,
        LeaveRequestStatus? status,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.ReviewedByUser)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(x => x.EmployeeId == employeeId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(x => x.EndDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(x => x.StartDate <= toDate.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }
}

