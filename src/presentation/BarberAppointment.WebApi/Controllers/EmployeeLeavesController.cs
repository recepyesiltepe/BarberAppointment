using System.Security.Claims;
using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Results;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberAppointment.WebApi.Controllers;

[ApiController]
[Route("api/employee-leaves")]
[Produces("application/json")]
public class EmployeeLeavesController : ControllerBase
{
    private readonly IEmployeeLeaveService _leaveService;
    private readonly IEmployeeService _employeeService;

    public EmployeeLeavesController(
        IEmployeeLeaveService leaveService,
        IEmployeeService employeeService)
    {
        _leaveService = leaveService;
        _employeeService = employeeService;
    }

    /// <summary>
    /// İzin taleplerini listeler. Admin tüm personelleri görebilir ve filtreleyebilir; personel yalnızca kendi taleplerini görür.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeLeaveRequestDto>>>> GetAll(
        [FromQuery] LeaveRequestFilterDto filter,
        CancellationToken cancellationToken)
    {
        if (IsEmployee())
        {
            var empId = await GetOrResolveEmployeeIdAsync(cancellationToken);
            if (empId.HasValue)
            {
                filter.EmployeeId = empId.Value;
            }
            else
            {
                return Ok(ApiResponse<IReadOnlyList<EmployeeLeaveRequestDto>>.Ok(
                    Array.Empty<EmployeeLeaveRequestDto>(), "Personel kaydı bulunamadı."));
            }
        }

        var results = await _leaveService.GetAllAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EmployeeLeaveRequestDto>>.Ok(results, "İzin talepleri başarıyla listelendi."));
    }

    /// <summary>
    /// Giriş yapmış personelin kendi izin taleplerini listeler.
    /// </summary>
    [HttpGet("my-leaves")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeLeaveRequestDto>>>> GetMyLeaves(
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(ApiResponse.Fail("Oturum açmış kullanıcı bilgisi bulunamadı.", StatusCodes.Status401Unauthorized));
        }

        var results = await _leaveService.GetMyLeavesAsync(currentUserId.Value, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EmployeeLeaveRequestDto>>.Ok(results, "Kişisel izin talepleriniz listelendi."));
    }

    /// <summary>
    /// Belirli bir izin talebinin detayını getirir.
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<ApiResponse<EmployeeLeaveRequestDto>>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _leaveService.GetByIdAsync(id, cancellationToken);

        if (IsEmployee())
        {
            var empId = await GetOrResolveEmployeeIdAsync(cancellationToken);
            if (!empId.HasValue || result.EmployeeId != empId.Value)
            {
                return Forbid();
            }
        }

        return Ok(ApiResponse<EmployeeLeaveRequestDto>.Ok(result));
    }

    /// <summary>
    /// Personel veya yönetici tarafından yeni izin talebi oluşturulmasını sağlar.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<ApiResponse<EmployeeLeaveRequestDto>>> Create(
        [FromBody] CreateLeaveRequestDto dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(ApiResponse.Fail("Oturum açmış kullanıcı bilgisi bulunamadı.", StatusCodes.Status401Unauthorized));
        }

        var result = await _leaveService.CreateAsync(dto, currentUserId.Value, IsAdmin(), cancellationToken);

        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<EmployeeLeaveRequestDto>.Ok(result, "İzin talebi başarıyla oluşturuldu.", StatusCodes.Status201Created));
    }

    /// <summary>
    /// Yönetici bir izin talebini onaylar (Kabul eder).
    /// Onaylanan izin süresince personelin takvimine randevu alınamaz.
    /// </summary>
    [HttpPut("{id:int}/approve")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<EmployeeLeaveRequestDto>>> Approve(
        int id,
        [FromBody] ReviewLeaveRequestDto? dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(ApiResponse.Fail("Oturum bilgisi eksik.", StatusCodes.Status401Unauthorized));
        }

        var result = await _leaveService.ApproveAsync(id, currentUserId.Value, dto?.AdminNote, cancellationToken);
        return Ok(ApiResponse<EmployeeLeaveRequestDto>.Ok(result, "İzin talebi başarıyla onaylandı. Bu süre zarfında randevu alınamayacaktır."));
    }

    /// <summary>
    /// Yönetici bir izin talebini reddeder.
    /// </summary>
    [HttpPut("{id:int}/reject")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<EmployeeLeaveRequestDto>>> Reject(
        int id,
        [FromBody] ReviewLeaveRequestDto? dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(ApiResponse.Fail("Oturum bilgisi eksik.", StatusCodes.Status401Unauthorized));
        }

        var result = await _leaveService.RejectAsync(id, currentUserId.Value, dto?.AdminNote, cancellationToken);
        return Ok(ApiResponse<EmployeeLeaveRequestDto>.Ok(result, "İzin talebi reddedildi."));
    }

    /// <summary>
    /// Personel (beklemedeki) veya yönetici (beklemedeki veya onaylanmış) izin talebini iptal eder.
    /// Onaylanmış bir izin yönetici tarafından iptal edildiğinde personelin randevu slotları yeniden kullanıma açılır.
    /// </summary>
    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<ApiResponse>> Cancel(
        int id,
        [FromBody] CancelLeaveRequestDto? dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(ApiResponse.Fail("Oturum bilgisi eksik.", StatusCodes.Status401Unauthorized));
        }

        await _leaveService.CancelAsync(id, currentUserId.Value, IsAdmin(), dto?.Reason, cancellationToken);
        return Ok(ApiResponse.Ok("İzin talebi başarıyla iptal edildi."));
    }

    // ─── Yetki Yardımcıları ──────────────────────────────────────────────────

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private bool IsAdmin() => User.IsInRole(Roles.Admin);

    private bool IsEmployee() => User.IsInRole(Roles.Employee);

    private async Task<int?> GetOrResolveEmployeeIdAsync(CancellationToken cancellationToken = default)
    {
        var claim = User.FindFirst("employee_id")?.Value;
        if (int.TryParse(claim, out var id))
            return id;

        var currentUserId = GetCurrentUserId();
        if (currentUserId.HasValue)
        {
            var employees = await _employeeService.GetAllAsync(false, cancellationToken);
            var emp = employees.FirstOrDefault(e => e.UserId == currentUserId.Value);
            return emp?.Id;
        }

        return null;
    }
}

