using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Results;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberAppointment.WebApi.Controllers;

/// <summary>
/// Randevu İşlem Geçmişi / Denetim İzi (Audit Log) API Controller.
/// Yalnızca sistem yöneticileri (Admin) tarafından görüntülenebilir.
/// Normal kullanıcılar bu kayıtları değiştiremez veya silemez.
/// </summary>
[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = Roles.Admin)]
[Produces("application/json")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Denetim günlüklerini (Audit Logs) filtrelenmiş olarak listeler.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentAuditLogDto>>>> GetFiltered(
        [FromQuery] int? appointmentId,
        [FromQuery] int? userId,
        [FromQuery] string? action,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken cancellationToken)
    {
        var filter = new AuditLogFilterDto
        {
            AppointmentId = appointmentId,
            UserId = userId,
            Action = action,
            StartDate = startDate,
            EndDate = endDate
        };

        var logs = await _auditLogService.GetFilteredAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AppointmentAuditLogDto>>.Ok(logs, $"{logs.Count} denetim kaydı listelendi."));
    }

    /// <summary>
    /// Belirli bir randevunun tüm durum değişiklik geçmişini listeler.
    /// </summary>
    [HttpGet("appointment/{appointmentId:int}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentAuditLogDto>>>> GetByAppointment(
        int appointmentId,
        CancellationToken cancellationToken)
    {
        var logs = await _auditLogService.GetByAppointmentIdAsync(appointmentId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AppointmentAuditLogDto>>.Ok(logs, $"Randevu #{appointmentId} için {logs.Count} işlem kaydı listelendi."));
    }
}
