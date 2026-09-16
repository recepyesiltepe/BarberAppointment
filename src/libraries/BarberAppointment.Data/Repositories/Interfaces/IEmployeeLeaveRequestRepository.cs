using BarberAppointment.Core.Enums;
using BarberAppointment.Domain.Entities;

namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IEmployeeLeaveRequestRepository : IRepository<EmployeeLeaveRequest>
{
    Task<EmployeeLeaveRequest?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeLeaveRequest>> GetByEmployeeIdAsync(int employeeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeLeaveRequest>> GetApprovedLeavesInRangeAsync(int employeeId, DateTime start, DateTime end, CancellationToken cancellationToken = default);
    Task<bool> HasApprovedLeaveConflictAsync(int employeeId, DateTime start, DateTime end, int? excludeLeaveId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeLeaveRequest>> GetFilteredAsync(int? employeeId, LeaveRequestStatus? status, DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
}

