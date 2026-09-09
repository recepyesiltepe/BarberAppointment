using BarberAppointment.Domain.Entities;

namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IAuditLogRepository : IRepository<AppointmentAuditLog>
{
    Task<IReadOnlyList<AppointmentAuditLog>> GetByAppointmentIdAsync(int appointmentId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AppointmentAuditLog>> GetFilteredAsync(
        int? appointmentId,
        int? userId,
        string? action,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default);
}

