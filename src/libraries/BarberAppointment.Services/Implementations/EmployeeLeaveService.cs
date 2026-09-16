using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace BarberAppointment.Services.Implementations;

public class EmployeeLeaveService : IEmployeeLeaveService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<EmployeeLeaveService> _logger;

    public EmployeeLeaveService(IUnitOfWork _unitOfWork, ILogger<EmployeeLeaveService> logger)
    {
        this._unitOfWork = _unitOfWork;
        _logger = logger;
    }

    public async Task<EmployeeLeaveRequestDto> CreateAsync(
        CreateLeaveRequestDto dto,
        int requestingUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        if (dto.StartDate >= dto.EndDate)
        {
            throw new BusinessException("İzin bitiş tarihi ve saati, başlangıç tarihinden sonra olmalıdır.");
        }

        if (dto.EndDate <= DateTime.UtcNow.AddMinutes(-10))
        {
            throw new BusinessException("Geçmiş bir zaman aralığı için izin talebinde bulunulamaz.");
        }

        int employeeId;
        Employee? employee;

        if (isAdmin && dto.EmployeeId.HasValue && dto.EmployeeId.Value > 0)
        {
            employeeId = dto.EmployeeId.Value;
            employee = await _unitOfWork.Employees.GetByIdAsync(employeeId, cancellationToken);
            if (employee == null)
            {
                throw new NotFoundException($"ID: {employeeId} olan personel bulunamadı.");
            }
        }
        else
        {
            var employees = await _unitOfWork.Employees.GetAllAsync(cancellationToken);
            employee = employees.FirstOrDefault(e => e.UserId == requestingUserId);
            if (employee == null)
            {
                throw new BusinessException("Bu kullanıcı hesabına bağlı bir personel kaydı bulunamadı.");
            }
            employeeId = employee.Id;
        }

        if (!employee.IsActive)
        {
            throw new BusinessException($"'{employee.FullName}' personeli aktif değildir.");
        }

        // Çakışan onaylı izin kontrolü
        var hasConflict = await _unitOfWork.EmployeeLeaves.HasApprovedLeaveConflictAsync(
            employeeId, dto.StartDate, dto.EndDate, cancellationToken: cancellationToken);

        if (hasConflict)
        {
            throw new BusinessException("Seçilen tarih ve saat aralığında personelin zaten onaylanmış bir izni bulunmaktadır.");
        }

        var leaveRequest = new EmployeeLeaveRequest
        {
            EmployeeId = employeeId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Reason = dto.Reason?.Trim(),
            Status = isAdmin ? LeaveRequestStatus.Approved : LeaveRequestStatus.Pending,
            ReviewedByUserId = isAdmin ? requestingUserId : null,
            ReviewedAt = isAdmin ? DateTime.UtcNow : null,
            AdminNote = isAdmin ? "Yönetici tarafından doğrudan oluşturuldu." : null
        };

        await _unitOfWork.EmployeeLeaves.AddAsync(leaveRequest, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Yeni izin talebi oluşturuldu: LeaveRequestId={Id}, EmployeeId={EmployeeId}, Durum={Status}",
            leaveRequest.Id, employeeId, leaveRequest.Status);

        leaveRequest.Employee = employee;
        return MapToDto(leaveRequest);
    }

    public async Task<IReadOnlyList<EmployeeLeaveRequestDto>> GetMyLeavesAsync(int userId, CancellationToken cancellationToken = default)
    {
        var employees = await _unitOfWork.Employees.GetAllAsync(cancellationToken);
        var employee = employees.FirstOrDefault(e => e.UserId == userId);
        if (employee == null)
        {
            return Array.Empty<EmployeeLeaveRequestDto>();
        }

        var requests = await _unitOfWork.EmployeeLeaves.GetByEmployeeIdAsync(employee.Id, cancellationToken);
        return requests.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<EmployeeLeaveRequestDto>> GetAllAsync(LeaveRequestFilterDto? filter, CancellationToken cancellationToken = default)
    {
        var requests = await _unitOfWork.EmployeeLeaves.GetFilteredAsync(
            filter?.EmployeeId,
            filter?.Status,
            filter?.FromDate,
            filter?.ToDate,
            cancellationToken);

        return requests.Select(MapToDto).ToList();
    }

    public async Task<EmployeeLeaveRequestDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var request = await _unitOfWork.EmployeeLeaves.GetByIdWithDetailsAsync(id, cancellationToken);
        if (request == null)
        {
            throw new NotFoundException($"ID: {id} olan izin talebi bulunamadı.");
        }

        return MapToDto(request);
    }

    public async Task<EmployeeLeaveRequestDto> ApproveAsync(int id, int adminUserId, string? adminNote, CancellationToken cancellationToken = default)
    {
        var request = await _unitOfWork.EmployeeLeaves.GetByIdWithDetailsAsync(id, cancellationToken);
        if (request == null)
        {
            throw new NotFoundException($"ID: {id} olan izin talebi bulunamadı.");
        }

        if (request.Status != LeaveRequestStatus.Pending)
        {
            throw new BusinessException($"Bu izin talebi beklemede değildir (Mevcut Durum: {GetStatusName(request.Status)}).");
        }

        request.Status = LeaveRequestStatus.Approved;
        request.AdminNote = adminNote?.Trim();
        request.ReviewedByUserId = adminUserId;
        request.ReviewedAt = DateTime.UtcNow;

        _unitOfWork.EmployeeLeaves.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("İzin talebi onaylandı: LeaveRequestId={Id}, ApprovedBy={AdminId}", id, adminUserId);

        return MapToDto(request);
    }

    public async Task<EmployeeLeaveRequestDto> RejectAsync(int id, int adminUserId, string? adminNote, CancellationToken cancellationToken = default)
    {
        var request = await _unitOfWork.EmployeeLeaves.GetByIdWithDetailsAsync(id, cancellationToken);
        if (request == null)
        {
            throw new NotFoundException($"ID: {id} olan izin talebi bulunamadı.");
        }

        if (request.Status != LeaveRequestStatus.Pending)
        {
            throw new BusinessException($"Bu izin talebi beklemede değildir (Mevcut Durum: {GetStatusName(request.Status)}).");
        }

        request.Status = LeaveRequestStatus.Rejected;
        request.AdminNote = adminNote?.Trim();
        request.ReviewedByUserId = adminUserId;
        request.ReviewedAt = DateTime.UtcNow;

        _unitOfWork.EmployeeLeaves.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("İzin talebi reddedildi: LeaveRequestId={Id}, RejectedBy={AdminId}", id, adminUserId);

        return MapToDto(request);
    }

    public async Task CancelAsync(int id, int requestingUserId, bool isAdmin, string? cancelReason = null, CancellationToken cancellationToken = default)
    {
        var request = await _unitOfWork.EmployeeLeaves.GetByIdWithDetailsAsync(id, cancellationToken);
        if (request == null)
        {
            throw new NotFoundException($"ID: {id} olan izin talebi bulunamadı.");
        }

        if (!isAdmin)
        {
            var employees = await _unitOfWork.Employees.GetAllAsync(cancellationToken);
            var employee = employees.FirstOrDefault(e => e.UserId == requestingUserId);
            if (employee == null || employee.Id != request.EmployeeId)
            {
                throw new BusinessException("Bu izin talebini iptal etme yetkiniz bulunmamaktadır.");
            }

            if (request.Status != LeaveRequestStatus.Pending)
            {
                if (request.Status == LeaveRequestStatus.Approved)
                {
                    throw new BusinessException("Onaylanmış izinler yalnızca yönetici tarafından iptal edilebilir.");
                }
                throw new BusinessException($"Yalnızca 'Beklemede' olan izin talepleri iptal edilebilir (Mevcut Durum: {GetStatusName(request.Status)}).");
            }
        }
        else
        {
            // Yönetici hem 'Beklemede' hem de 'Onaylandı' durumundaki izinleri iptal edebilir.
            if (request.Status != LeaveRequestStatus.Pending && request.Status != LeaveRequestStatus.Approved)
            {
                throw new BusinessException($"Yalnızca 'Beklemede' veya 'Onaylandı' durumundaki izinler iptal edilebilir (Mevcut Durum: {GetStatusName(request.Status)}).");
            }
        }

        if (isAdmin && !string.IsNullOrWhiteSpace(cancelReason))
        {
            request.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote)
                ? $"İptal Nedeni: {cancelReason.Trim()}"
                : $"{request.AdminNote} | İptal Nedeni: {cancelReason.Trim()}";
            request.ReviewedByUserId = requestingUserId;
            request.ReviewedAt = DateTime.UtcNow;
        }

        request.Status = LeaveRequestStatus.Cancelled;
        _unitOfWork.EmployeeLeaves.Update(request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("İzin talebi iptal edildi: LeaveRequestId={Id}, CancelledBy={UserId}, IsAdmin={IsAdmin}, Reason={Reason}",
            id, requestingUserId, isAdmin, cancelReason);
    }

    private static EmployeeLeaveRequestDto MapToDto(EmployeeLeaveRequest r) => new()
    {
        Id = r.Id,
        EmployeeId = r.EmployeeId,
        EmployeeName = r.Employee?.FullName ?? $"Personel #{r.EmployeeId}",
        StartDate = r.StartDate,
        EndDate = r.EndDate,
        Reason = r.Reason,
        Status = r.Status,
        StatusName = GetStatusName(r.Status),
        AdminNote = r.AdminNote,
        ReviewedByUserId = r.ReviewedByUserId,
        ReviewedByName = r.ReviewedByUser?.FullName,
        ReviewedAt = r.ReviewedAt,
        CreatedAt = r.CreatedAt
    };

    private static string GetStatusName(LeaveRequestStatus status) => status switch
    {
        LeaveRequestStatus.Pending => "Beklemede",
        LeaveRequestStatus.Approved => "Onaylandı",
        LeaveRequestStatus.Rejected => "Reddedildi",
        LeaveRequestStatus.Cancelled => "İptal Edildi",
        _ => status.ToString()
    };
}

