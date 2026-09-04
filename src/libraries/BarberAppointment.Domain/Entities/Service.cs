namespace BarberAppointment.Domain.Entities;

public class Service : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }

    // Navigation properties
    public virtual ICollection<EmployeeService> EmployeeServices { get; set; } = new List<EmployeeService>();
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
