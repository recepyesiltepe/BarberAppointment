using BarberAppointment.Core.Enums;

namespace BarberAppointment.Services.DTOs;

public class EmployeeLeaveRequestDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
    public LeaveRequestStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public int? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateLeaveRequestDto
{
    public int? EmployeeId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
}

public class ReviewLeaveRequestDto
{
    public string? AdminNote { get; set; }
}

public class LeaveRequestFilterDto
{
    public int? EmployeeId { get; set; }
    public LeaveRequestStatus? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class CancelLeaveRequestDto
{
    public string? Reason { get; set; }
}

