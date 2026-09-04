namespace BarberAppointment.Domain.Entities;

public class Employee : BaseEntity
{
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }

    // Navigation properties
    public virtual User? User { get; set; }
    public virtual ICollection<EmployeeService> EmployeeServices { get; set; } = new List<EmployeeService>();
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
