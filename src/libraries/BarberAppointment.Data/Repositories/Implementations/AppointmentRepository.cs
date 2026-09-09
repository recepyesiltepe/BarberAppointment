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

    public async Task<(IReadOnlyList<Appointment> Items, int TotalCount)> GetPagedAsync(
        int? employeeId,
        int? userId,
        AppointmentStatus? status,
        DateTime? start,
        DateTime? end,
        string? search,
        int pageNumber,
        int pageSize,
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

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmed = search.Trim().ToLower();
            query = query.Where(a =>
                a.User.FullName.ToLower().Contains(trimmed) ||
                (a.User.Phone != null && a.User.Phone.Contains(trimmed)) ||
                a.Employee.FullName.ToLower().Contains(trimmed) ||
                a.Service.Name.ToLower().Contains(trimmed) ||
                (a.Notes != null && a.Notes.ToLower().Contains(trimmed)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 100) pageSize = 100;

        var items = await query
            .OrderByDescending(a => a.StartAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
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

    public async Task<IReadOnlyList<Appointment>> GetPendingRemindersAsync(
        DateTime windowStart,
        DateTime windowEnd,
        CancellationToken cancellationToken = default)
    {
        return await DbSet
            .Include(a => a.User)
            .Include(a => a.Employee)
            .Include(a => a.Service)
            .Where(a =>
                a.IsActive &&
                !a.IsReminderSent &&
                (a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.Pending) &&
                a.StartAt >= windowStart &&
                a.StartAt <= windowEnd)
            .OrderBy(a => a.StartAt)
            .ToListAsync(cancellationToken);
    }
}
