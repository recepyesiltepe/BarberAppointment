using BarberAppointment.Core.Enums;

namespace BarberAppointment.Domain.Entities;

public class Appointment : BaseEntity
{
    public int UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public int EmployeeId { get; set; }
    public virtual Employee Employee { get; set; } = null!;

    public int ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public string? Notes { get; set; }
}
