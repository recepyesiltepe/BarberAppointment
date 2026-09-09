using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Repositories.Implementations;

public class AuditLogRepository : Repository<AppointmentAuditLog>, IAuditLogRepository
{
    public AuditLogRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<AppointmentAuditLog>> GetByAppointmentIdAsync(int appointmentId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(a => a.AppointmentId == appointmentId)
            .OrderByDescending(a => a.ChangedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AppointmentAuditLog>> GetFilteredAsync(
        int? appointmentId,
        int? userId,
        string? action,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet.AsNoTracking().AsQueryable();

        if (appointmentId.HasValue)
            query = query.Where(a => a.AppointmentId == appointmentId.Value);

        if (userId.HasValue)
            query = query.Where(a => a.ChangedByUserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action.ToLower() == action.ToLower());

        if (startDate.HasValue)
            query = query.Where(a => a.ChangedDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.ChangedDate <= endDate.Value);

        return await query.OrderByDescending(a => a.ChangedDate).ToListAsync(cancellationToken);
    }
}

