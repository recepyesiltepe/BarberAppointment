using BarberAppointment.Core.Enums;

namespace BarberAppointment.Domain.Entities;

public class EmployeeLeaveRequest : BaseEntity
{
    public int EmployeeId { get; set; }
    public virtual Employee Employee { get; set; } = null!;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public string? Reason { get; set; }
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Pending;

    public string? AdminNote { get; set; }
    public int? ReviewedByUserId { get; set; }
    public virtual User? ReviewedByUser { get; set; }
    public DateTime? ReviewedAt { get; set; }

    /// <summary>
    /// Belirtilen zaman aralığının bu onaylanmış izinle çakışıp çakışmadığını denetler.
    /// </summary>
    public bool OverlapsWith(DateTime start, DateTime end)
    {
        return Status == LeaveRequestStatus.Approved && start < EndDate && end > StartDate;
    }
}

