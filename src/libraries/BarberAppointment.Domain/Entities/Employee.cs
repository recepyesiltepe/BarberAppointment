namespace BarberAppointment.Domain.Entities;

public class Employee : BaseEntity
{
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }

    // Personel mesai ve izin günleri
    public TimeSpan WorkStartTime { get; set; } = new(9, 0, 0);
    public TimeSpan WorkEndTime { get; set; } = new(19, 0, 0);
    public DayOfWeek? WeeklyOffDay { get; set; } = DayOfWeek.Sunday;

    // Navigation properties
    public virtual User? User { get; set; }
    public virtual ICollection<EmployeeService> EmployeeServices { get; set; } = new List<EmployeeService>();
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
