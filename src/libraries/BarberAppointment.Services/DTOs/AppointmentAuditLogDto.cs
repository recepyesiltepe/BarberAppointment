namespace BarberAppointment.Services.DTOs;

public class AppointmentAuditLogDto
{
    public int Id { get; set; }
    public int AppointmentId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public int? ChangedByUserId { get; set; }
    public string? ChangedByRole { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime ChangedDate { get; set; }
    public string? Details { get; set; }
}

public class AuditLogFilterDto
{
    public int? AppointmentId { get; set; }
    public int? UserId { get; set; }
    public string? Action { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

