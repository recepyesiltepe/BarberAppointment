using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace BarberAppointment.Services.Implementations;

public class AuditLogService : IAuditLogService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider,
        ILogger<AuditLogService> logger)
    {
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AppointmentAuditLogDto>> GetByAppointmentIdAsync(int appointmentId, CancellationToken cancellationToken = default)
    {
        var logs = await _unitOfWork.AuditLogs.GetByAppointmentIdAsync(appointmentId, cancellationToken);
        return logs.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<AppointmentAuditLogDto>> GetFilteredAsync(AuditLogFilterDto filter, CancellationToken cancellationToken = default)
    {
        var logs = await _unitOfWork.AuditLogs.GetFilteredAsync(
            filter.AppointmentId,
            filter.UserId,
            filter.Action,
            filter.StartDate,
            filter.EndDate,
            cancellationToken);

        return logs.Select(MapToDto).ToList();
    }

    public async Task LogAsync(
        int appointmentId,
        string action,
        string? oldStatus,
        string newStatus,
        int? changedByUserId,
        string? changedByRole,
        string? changedByName,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        var auditLog = new AppointmentAuditLog
        {
            AppointmentId = appointmentId,
            Action = action,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            ChangedByUserId = changedByUserId,
            ChangedByRole = changedByRole,
            ChangedByName = changedByName,
            ChangedDate = _dateTimeProvider.UtcNow,
            Details = details
        };

        await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "AuditLog kaydedildi: RandevuId={AppointmentId}, İşlem={Action}, EskiDurum={OldStatus}, YeniDurum={NewStatus}, Değiştiren={ChangedByName} ({Role})",
            appointmentId, action, oldStatus ?? "None", newStatus, changedByName ?? "Bilinmiyor", changedByRole ?? "System");
    }

    private static AppointmentAuditLogDto MapToDto(AppointmentAuditLog log)
    {
        return new AppointmentAuditLogDto
        {
            Id = log.Id,
            AppointmentId = log.AppointmentId,
            Action = log.Action,
            OldStatus = log.OldStatus,
            NewStatus = log.NewStatus,
            ChangedByUserId = log.ChangedByUserId,
            ChangedByRole = log.ChangedByRole,
            ChangedByName = log.ChangedByName,
            ChangedDate = log.ChangedDate,
            Details = log.Details
        };
    }
}

