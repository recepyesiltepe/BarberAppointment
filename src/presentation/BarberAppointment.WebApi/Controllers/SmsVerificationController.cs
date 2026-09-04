using System.Security.Claims;
using BarberAppointment.Core.Results;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberAppointment.WebApi.Controllers;

[ApiController]
[Route("api/sms")]
[Produces("application/json")]
public class SmsVerificationController : ControllerBase
{
    private readonly ISmsVerificationService _smsVerificationService;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAppointmentService _appointmentService;

    public SmsVerificationController(
        ISmsVerificationService smsVerificationService,
        IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        IAppointmentService appointmentService)
    {
        _smsVerificationService = smsVerificationService;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _appointmentService = appointmentService;
    }

    /// <summary>
    /// Belirtilen cep telefonu numarasına 6 haneli OTP SMS doğrulama kodu gönderir (Ek Geliştirme 3).
    /// </summary>
    /// <param name="dto">Telefon numarası bilgisi.</param>
    /// <param name="cancellationToken">İptal belirteci.</param>
    [HttpPost("send-code")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<SmsVerificationResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<SmsVerificationResultDto>>> SendCode(
        [FromBody] SendSmsVerificationDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _smsVerificationService.SendCodeAsync(dto.PhoneNumber, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(ApiResponse.Fail(result.Message, StatusCodes.Status400BadRequest));
        }

        return Ok(ApiResponse<SmsVerificationResultDto>.Ok(result, result.Message));
    }

    /// <summary>
    /// Kullanıcının cep telefonuna gelen 6 haneli SMS kodunu doğrular (Ek Geliştirme 3).
    /// Başarılı doğrulamada bu numaraya sahip kullanıcı varsa IsPhoneVerified = true yapılır (Ek Geliştirme 4).
    /// </summary>
    /// <param name="dto">Telefon numarası ve kod.</param>
    /// <param name="cancellationToken">İptal belirteci.</param>
    [HttpPost("verify-code")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<SmsVerificationResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<SmsVerificationResultDto>>> VerifyCode(
        [FromBody] VerifySmsCodeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _smsVerificationService.VerifyCodeAsync(dto.PhoneNumber, dto.Code, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(ApiResponse.Fail(result.Message, StatusCodes.Status400BadRequest));
        }

        // Ek Geliştirme 4: Eşleşen kullanıcı varsa IsPhoneVerified = true olarak işaretle
        var normalized = SmsVerificationService.NormalizePhone(dto.PhoneNumber);
        var allUsers = await _userRepository.GetAllAsync(cancellationToken);
        var matchedUser = allUsers.FirstOrDefault(u => !string.IsNullOrEmpty(u.Phone) && SmsVerificationService.NormalizePhone(u.Phone) == normalized);
        if (matchedUser != null)
        {
            matchedUser.IsPhoneVerified = true;
            _userRepository.Update(matchedUser);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiResponse<SmsVerificationResultDto>.Ok(result, result.Message));
    }

    /// <summary>
    /// Telefon numarasının doğrulama ve bekleme durumunu sorgular (Ek Geliştirme 3).
    /// </summary>
    /// <param name="phoneNumber">Telefon numarası.</param>
    /// <param name="cancellationToken">İptal belirteci.</param>
    [HttpGet("status")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<SmsVerificationStatusDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<SmsVerificationStatusDto>>> GetStatus(
        [FromQuery] string phoneNumber,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return BadRequest(ApiResponse.Fail("Telefon numarası parametresi gereklidir.", StatusCodes.Status400BadRequest));
        }

        var status = await _smsVerificationService.GetStatusAsync(phoneNumber, cancellationToken);
        return Ok(ApiResponse<SmsVerificationStatusDto>.Ok(status));
    }

    /// <summary>
    /// Giriş yapmış kullanıcının profil telefon numarasını doğrular, veritabanında günceller ve IsPhoneVerified = true yapar (Ek Geliştirme 4).
    /// </summary>
    [HttpPost("verify-my-phone")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<SmsVerificationResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<SmsVerificationResultDto>>> VerifyMyPhone(
        [FromBody] VerifySmsCodeDto dto,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse.Fail("Geçersiz oturum bilgisi.", StatusCodes.Status401Unauthorized));
        }

        var result = await _smsVerificationService.VerifyCodeAsync(dto.PhoneNumber, dto.Code, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(ApiResponse.Fail(result.Message, StatusCodes.Status400BadRequest));
        }

        // Ek Geliştirme 4: Kullanıcının telefon numarasını ve IsPhoneVerified durumunu güncelle
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            user.Phone = dto.PhoneNumber.Trim();
            user.IsPhoneVerified = true;
            _userRepository.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        result.Message = "Telefon numaranız başarıyla doğrulandı ve profilinize kaydedildi.";
        return Ok(ApiResponse<SmsVerificationResultDto>.Ok(result, result.Message));
    }

    /// <summary>
    /// SMS kodunu doğrular, kullanıcıyı doğrulanmış olarak işaretler ve randevuyu kesintisiz otomatik oluşturur (Ek Geliştirme 4).
    /// </summary>
    [HttpPost("verify-and-book")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<VerifyAndBookResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<VerifyAndBookResultDto>>> VerifyAndBook(
        [FromBody] VerifyAndBookDto dto,
        CancellationToken cancellationToken)
    {
        // 1. SMS Kodunu Doğrula
        var smsResult = await _smsVerificationService.VerifyCodeAsync(dto.PhoneNumber, dto.Code, cancellationToken);
        if (!smsResult.Success)
        {
            return BadRequest(ApiResponse.Fail(smsResult.Message, StatusCodes.Status400BadRequest));
        }

        // 2. Kullanıcı/Telefon doğrulanmış olarak işaretle (Ek Geliştirme 4)
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int targetUserId = 0;
        if (int.TryParse(userIdClaim, out var claimId) && claimId > 0)
        {
            targetUserId = claimId;
        }
        else if (dto.Appointment.UserId > 0)
        {
            targetUserId = dto.Appointment.UserId;
        }

        if (targetUserId > 0)
        {
            var user = await _userRepository.GetByIdAsync(targetUserId, cancellationToken);
            if (user != null)
            {
                user.Phone = dto.PhoneNumber.Trim();
                user.IsPhoneVerified = true;
                _userRepository.Update(user);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

        // 3. İlgili İşlem Akışının Devam Etmesi: Randevuyu Otomatik Oluştur
        dto.Appointment.UserId = targetUserId > 0 ? targetUserId : dto.Appointment.UserId;
        var appointment = await _appointmentService.CreateAsync(dto.Appointment, cancellationToken);

        var result = new VerifyAndBookResultDto
        {
            Success = true,
            Message = "Telefon numaranız başarıyla doğrulandı ve randevunuz oluşturuldu.",
            SmsVerification = smsResult,
            Appointment = appointment
        };

        return Ok(ApiResponse<VerifyAndBookResultDto>.Ok(result, result.Message));
    }
}
