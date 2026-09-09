using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IAuditLogService
{
    Task<IReadOnlyList<AppointmentAuditLogDto>> GetByAppointmentIdAsync(int appointmentId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AppointmentAuditLogDto>> GetFilteredAsync(AuditLogFilterDto filter, CancellationToken cancellationToken = default);

    Task LogAsync(
        int appointmentId,
        string action,
        string? oldStatus,
        string newStatus,
        int? changedByUserId,
        string? changedByRole,
        string? changedByName,
        string? details = null,
        CancellationToken cancellationToken = default);
}

