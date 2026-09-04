using BarberAppointment.Core.Enums;
using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Repositories.Implementations;

public class AppointmentRepository : Repository<Appointment>, IAppointmentRepository
{
    public AppointmentRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Appointment>> GetAppointmentsWithDetailsAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(a => a.User)
            .Include(a => a.Employee)
            .Include(a => a.Service)
            .OrderByDescending(a => a.StartAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Appointment>> GetFilteredAsync(
        int? employeeId,
        int? userId,
        AppointmentStatus? status,
        DateTime? start,
        DateTime? end,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet
            .AsNoTracking()
            .Include(a => a.User)
            .Include(a => a.Employee)
            .Include(a => a.Service)
            .AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(a => a.EmployeeId == employeeId.Value);

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId.Value);

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        if (start.HasValue)
            query = query.Where(a => a.StartAt >= start.Value);

        if (end.HasValue)
            query = query.Where(a => a.StartAt <= end.Value);

        return await query
            .OrderByDescending(a => a.StartAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Appointment?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(a => a.User)
            .Include(a => a.Employee)
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Appointment>> GetByEmployeeAndDateRangeAsync(
        int employeeId,
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(a => a.User)
            .Include(a => a.Service)
            .Where(a =>
                a.EmployeeId == employeeId &&
                a.StartAt >= start &&
                a.EndAt <= end &&
                a.Status != AppointmentStatus.Cancelled)
            .OrderBy(a => a.StartAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Appointment>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Include(a => a.Employee)
            .Include(a => a.Service)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasConflictAsync(
        int employeeId,
        DateTime startAt,
        DateTime endAt,
        int? excludeAppointmentId = null,
        CancellationToken cancellationToken = default)
    {
        // Çakışma formülü: (YeniBaşlangıç < MevcutBitiş) AND (YeniBitiş > MevcutBaşlangıç)
        var query = DbSet
            .Where(a =>
                a.EmployeeId == employeeId &&
                a.Status != AppointmentStatus.Cancelled &&
                a.IsActive &&
                startAt < a.EndAt &&
                endAt > a.StartAt);

        if (excludeAppointmentId.HasValue)
            query = query.Where(a => a.Id != excludeAppointmentId.Value);

        return await query.AnyAsync(cancellationToken);
    }
}
