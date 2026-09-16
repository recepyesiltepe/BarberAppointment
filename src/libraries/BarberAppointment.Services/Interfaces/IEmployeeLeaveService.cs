using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IEmployeeLeaveService
{
    Task<EmployeeLeaveRequestDto> CreateAsync(CreateLeaveRequestDto dto, int requestingUserId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeLeaveRequestDto>> GetMyLeavesAsync(int userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeLeaveRequestDto>> GetAllAsync(LeaveRequestFilterDto? filter, CancellationToken cancellationToken = default);
    Task<EmployeeLeaveRequestDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<EmployeeLeaveRequestDto> ApproveAsync(int id, int adminUserId, string? adminNote, CancellationToken cancellationToken = default);
    Task<EmployeeLeaveRequestDto> RejectAsync(int id, int adminUserId, string? adminNote, CancellationToken cancellationToken = default);
    Task CancelAsync(int id, int requestingUserId, bool isAdmin, string? cancelReason = null, CancellationToken cancellationToken = default);
}

