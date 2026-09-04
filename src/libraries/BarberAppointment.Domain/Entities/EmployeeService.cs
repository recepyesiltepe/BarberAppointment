namespace BarberAppointment.Domain.Entities;

public class EmployeeService
{
    public int EmployeeId { get; set; }
    public virtual Employee Employee { get; set; } = null!;

    public int ServiceId { get; set; }
    public virtual Service Service { get; set; } = null!;
}
