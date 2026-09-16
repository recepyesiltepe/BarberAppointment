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

    /// <summary>
    /// Virgülle ayrılmış haftalık çalışma günleri indeksleri (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi).
    /// Örn: "1,2,3,4,5,6" (Pazartesi-Cumartesi). Boş ise WeeklyOffDay esas alınır.
    /// </summary>
    public string? WorkingDays { get; set; }

    /// <summary>
    /// Personelin verilen günde çalışıp çalışmadığını belirler.
    /// </summary>
    public bool IsWorkingOn(DayOfWeek day)
    {
        if (!string.IsNullOrWhiteSpace(WorkingDays))
        {
            var days = WorkingDays.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var d) ? (int?)d : null)
                .Where(d => d.HasValue)
                .Select(d => (DayOfWeek)d!.Value)
                .ToHashSet();
            return days.Contains(day);
        }

        if (WeeklyOffDay.HasValue)
        {
            return day != WeeklyOffDay.Value;
        }

        return true;
    }

    // Navigation properties
    public virtual User? User { get; set; }
    public virtual ICollection<EmployeeService> EmployeeServices { get; set; } = new List<EmployeeService>();
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public virtual ICollection<EmployeeLeaveRequest> LeaveRequests { get; set; } = new List<EmployeeLeaveRequest>();
}
