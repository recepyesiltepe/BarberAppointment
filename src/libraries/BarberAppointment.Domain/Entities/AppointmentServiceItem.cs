namespace BarberAppointment.Domain.Entities;

public class AppointmentServiceItem : BaseEntity
{
    public int AppointmentId { get; set; }
    public virtual Appointment Appointment { get; set; } = null!;

    public int ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;

    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
}

