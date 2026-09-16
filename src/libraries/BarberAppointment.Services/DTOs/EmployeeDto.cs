namespace BarberAppointment.Services.DTOs;

public class EmployeeDto
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Title { get; set; }
    public bool IsActive { get; set; }
    public TimeSpan WorkStartTime { get; set; } = new(9, 0, 0);
    public TimeSpan WorkEndTime { get; set; } = new(19, 0, 0);
    public DayOfWeek? WeeklyOffDay { get; set; } = DayOfWeek.Sunday;
    public string? WorkingDays { get; set; }
    public List<ServiceDto> Services { get; set; } = new();
}

public class CreateEmployeeDto
{
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public string? Title { get; set; }
    public TimeSpan WorkStartTime { get; set; } = new(9, 0, 0);
    public TimeSpan WorkEndTime { get; set; } = new(19, 0, 0);
    public DayOfWeek? WeeklyOffDay { get; set; } = DayOfWeek.Sunday;
    public string? WorkingDays { get; set; }
    public List<int> ServiceIds { get; set; } = new();
}

public class UpdateEmployeeDto
{
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public string? Title { get; set; }
    public bool IsActive { get; set; } = true;
    public TimeSpan WorkStartTime { get; set; } = new(9, 0, 0);
    public TimeSpan WorkEndTime { get; set; } = new(19, 0, 0);
    public DayOfWeek? WeeklyOffDay { get; set; }
    public string? WorkingDays { get; set; }
    public List<int>? ServiceIds { get; set; }
}

public class AssignServicesDto
{
    public List<int> ServiceIds { get; set; } = new();
}
