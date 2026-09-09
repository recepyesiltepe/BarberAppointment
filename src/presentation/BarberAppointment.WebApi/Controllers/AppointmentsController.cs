using System.Security.Claims;
using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Results;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberAppointment.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ILogger<AppointmentsController> _logger;

    public AppointmentsController(IAppointmentService appointmentService, ILogger<AppointmentsController> logger)
    {
        _appointmentService = appointmentService;
        _logger = logger;
    }

    /// <summary>
    /// Tüm randevuları sayfalanmış, filtrelenmiş ve aranabilir olarak listeler (Admin ve Personel erişebilir).
    /// </summary>
    [HttpGet]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<PagedApiResponse<AppointmentDto>>> GetAll(
        [FromQuery] AppointmentFilterDto filter,
        CancellationToken cancellationToken)
    {
        var pagedResult = await _appointmentService.GetPagedAsync(filter, cancellationToken);
        return Ok(PagedApiResponse<AppointmentDto>.Ok(pagedResult, $"{pagedResult.TotalCount} randevu listelendi (Sayfa {pagedResult.PageNumber}/{pagedResult.TotalPages})."));
    }

    /// <summary>
    /// Randevuları çok kriterli filtreler, arar ve sayfalar (Giriş yapmış kullanıcılar).
    /// </summary>
    [HttpGet("filter")]
    [Authorize]
    public async Task<ActionResult<PagedApiResponse<AppointmentDto>>> GetFiltered(
        [FromQuery] AppointmentFilterDto filter,
        CancellationToken cancellationToken)
    {
        // Müşteri ise yalnızca kendi randevularını filtreleyebilir
        if (IsCustomer())
        {
            var currentUserId = GetCurrentUserId();
            filter.UserId = currentUserId;
        }

        var pagedResult = await _appointmentService.GetPagedAsync(filter, cancellationToken);
        return Ok(PagedApiResponse<AppointmentDto>.Ok(pagedResult, $"{pagedResult.TotalCount} randevu bulundu (Sayfa {pagedResult.PageNumber}/{pagedResult.TotalPages})."));
    }

    /// <summary>
    /// Giriş yapmış kullanıcının kendi randevularını listeler.
    /// </summary>
    [HttpGet("my")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentDto>>>> GetMy(CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized(ApiResponse.Fail("Geçersiz oturum bilgisi.", StatusCodes.Status401Unauthorized));

        var appointments = await _appointmentService.GetByUserAsync(currentUserId.Value, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AppointmentDto>>.Ok(appointments, $"{appointments.Count} randevu bulundu."));
    }

    /// <summary>
    /// ID'ye göre randevu detayını getirir (Giriş yapmış kullanıcılar).
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var appointment = await _appointmentService.GetByIdAsync(id, cancellationToken);
        if (appointment == null)
            return NotFound(ApiResponse.Fail($"ID: {id} olan randevu bulunamadı.", StatusCodes.Status404NotFound));

        // Müşteri yalnızca kendi randevu detayını görebilir
        if (IsCustomer())
        {
            var currentUserId = GetCurrentUserId();
            if (appointment.UserId != currentUserId)
            {
                _logger.LogWarning("Kullanıcı {UserId} başkasına ait randevu ({AppointmentId}) detayını görüntülemeye çalıştı.", currentUserId, id);
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse.Fail("Yalnızca kendi randevu detayınızı görüntüleyebilirsiniz.", StatusCodes.Status403Forbidden));
            }
        }

        return Ok(ApiResponse<AppointmentDto>.Ok(appointment));
    }

    /// <summary>
    /// Belirli bir personelin belirtilen gündeki randevularını listeler.
    /// </summary>
    [HttpGet("employee/{employeeId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentDto>>>> GetByEmployee(
        int employeeId,
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var targetDate = date ?? DateTime.UtcNow;
        var appointments = await _appointmentService.GetByEmployeeAsync(employeeId, targetDate, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AppointmentDto>>.Ok(appointments, $"{targetDate:yyyy-MM-dd} için {appointments.Count} randevu."));
    }

    /// <summary>
    /// Belirli bir müşterinin tüm randevularını listeler (Giriş yapmış kullanıcılar).
    /// </summary>
    [HttpGet("user/{userId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentDto>>>> GetByUser(
        int userId,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (IsCustomer() && currentUserId != userId)
        {
            _logger.LogWarning("Kullanıcı {UserId} başkasına ait randevuları ({TargetUserId}) görüntülemeye çalıştı.", currentUserId, userId);
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse.Fail("Yalnızca kendi randevularınızı görüntüleyebilirsiniz.", StatusCodes.Status403Forbidden));
        }

        var appointments = await _appointmentService.GetByUserAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AppointmentDto>>.Ok(appointments));
    }

    /// <summary>
    /// Belirtilen personelin, belirtilen tarih için boş randevu slotlarını listeler (Herkese açık).
    /// </summary>
    [HttpGet("available-slots")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AvailableSlotDto>>>> GetAvailableSlots(
        [FromQuery] int employeeId,
        [FromQuery] int serviceId,
        [FromQuery] DateTime date,
        CancellationToken cancellationToken)
    {
        var query = new AvailableSlotsQueryDto
        {
            EmployeeId = employeeId,
            ServiceId = serviceId,
            Date = date
        };

        var slots = await _appointmentService.GetAvailableSlotsAsync(query, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AvailableSlotDto>>.Ok(slots, $"{date:yyyy-MM-dd} için {slots.Count} boş slot bulundu."));
    }

    /// <summary>
    /// Yeni bir randevu oluşturur (Giriş yapmış kullanıcılar).
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Create(
        [FromBody] CreateAppointmentDto dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        // Müşteri ise veya dto.UserId belirtilmemişse oturumdaki kullanıcının ID'sini bağla
        if (IsCustomer() || dto.UserId <= 0)
        {
            if (currentUserId.HasValue)
                dto.UserId = currentUserId.Value;
        }

        var created = await _appointmentService.CreateAsync(dto, currentUserId, !IsCustomer(), cancellationToken);
        return CreatedAtAction(
            nameof(GetById),
            new { id = created.Id },
            ApiResponse<AppointmentDto>.Ok(created, "Randevu başarıyla oluşturuldu.", StatusCodes.Status201Created));
    }

    /// <summary>
    /// Mevcut bir randevuyu yeniden zamanlar (Giriş yapmış kullanıcılar).
    /// </summary>
    [HttpPut("{id:int}/reschedule")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AppointmentDto>>> Reschedule(
        int id,
        [FromBody] UpdateAppointmentDto dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (IsCustomer())
        {
            var existing = await _appointmentService.GetByIdAsync(id, cancellationToken);
            if (existing != null && existing.UserId != currentUserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse.Fail("Yalnızca kendi randevunuzu yeniden zamanlayabilirsiniz.", StatusCodes.Status403Forbidden));
            }
        }

        var updated = await _appointmentService.RescheduleAsync(id, dto, currentUserId, !IsCustomer(), cancellationToken);
        return Ok(ApiResponse<AppointmentDto>.Ok(updated, "Randevu başarıyla yeniden zamanlandı."));
    }

    /// <summary>
    /// Randevuyu iptal eder (Giriş yapmış kullanıcılar).
    /// </summary>
    [HttpPut("{id:int}/cancel")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> Cancel(int id, CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (IsCustomer())
        {
            var existing = await _appointmentService.GetByIdAsync(id, cancellationToken);
            if (existing != null && existing.UserId != currentUserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse.Fail("Yalnızca kendi randevunuzu iptal edebilirsiniz.", StatusCodes.Status403Forbidden));
            }
        }

        await _appointmentService.CancelAsync(id, currentUserId, !IsCustomer(), cancellationToken);
        return Ok(ApiResponse.Ok("Randevu başarıyla iptal edildi."));
    }

    /// <summary>
    /// Randevuyu tamamlandı olarak işaretler (Yalnızca Admin ve Personel).
    /// </summary>
    [HttpPut("{id:int}/complete")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Employee}")]
    public async Task<ActionResult<ApiResponse>> Complete(int id, CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        await _appointmentService.CompleteAsync(id, currentUserId, !IsCustomer(), cancellationToken);
        return Ok(ApiResponse.Ok("Randevu tamamlandı olarak işaretlendi."));
    }

    /// <summary>
    /// E-posta gönderim altyapısını test eder (Ek Geliştirme 1).
    /// </summary>
    [HttpPost("test-email")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> TestEmail(
        [FromQuery] string toEmail,
        [FromServices] IEmailService emailService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(toEmail) || !toEmail.Contains('@'))
        {
            return BadRequest(ApiResponse.Fail("Geçerli bir e-posta adresi belirtiniz.", StatusCodes.Status400BadRequest));
        }

        var sampleAppointment = new AppointmentDto
        {
            Id = 9999,
            CustomerName = "Test Müşteri",
            EmployeeName = "Ali Usta",
            ServiceName = "Saç Kesimi & Yıkama",
            Price = 350,
            DurationMinutes = 35,
            StartAt = DateTime.Today.AddHours(14),
            EndAt = DateTime.Today.AddHours(14).AddMinutes(35),
            Status = AppointmentStatus.Confirmed,
            Notes = "Test e-posta gönderim doğrulaması."
        };

        var success = await emailService.SendAppointmentConfirmationAsync(sampleAppointment, toEmail, cancellationToken);

        return Ok(ApiResponse.Ok(
            success
                ? "Test e-postası başarıyla işlendi (gönderildi veya simüle edildi)."
                : "E-posta gönderimi sırasında bir uyarı/hata oluştu. Sunucu loglarını kontrol ediniz."));
    }

    /// <summary>
    /// Yaklaşan randevu hatırlatmalarını manuel veya test amaçlı tetikler.
    /// </summary>
    [HttpPost("trigger-reminders")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<object>>> TriggerReminders(
        [FromServices] IAppointmentReminderProcessor reminderProcessor,
        CancellationToken cancellationToken)
    {
        var processedCount = await reminderProcessor.ProcessPendingRemindersAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(
            new { processedCount },
            $"{processedCount} adet randevu hatırlatması başarıyla işlendi."));
    }

    // ─── Yardımcı Yetki Metotları ─────────────────────────────────────────────

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private bool IsCustomer() => User.IsInRole(Roles.Customer);
}
