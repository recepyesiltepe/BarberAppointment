using System.Security.Claims;
using BarberAppointment.Core.Results;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberAppointment.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Yeni bir kullanıcı (varsayılan: Müşteri) kaydı oluşturur ve JWT Access Token döner.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register(
        [FromBody] RegisterDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(dto, cancellationToken);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<AuthResponseDto>.Ok(result, "Kullanıcı kaydı başarıyla oluşturuldu.", StatusCodes.Status201Created));
    }

    /// <summary>
    /// E-posta ve şifre ile giriş yapar, JWT Access Token üretir.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login(
        [FromBody] LoginDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(dto, cancellationToken);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Giriş başarılı."));
    }

    /// <summary>
    /// Giriş yapmış mevcut kullanıcının profil bilgilerini getirir (JWT Token gerektirir).
    /// Güvenli UserProfileDto döner; dahili backend alanları filtrelenmiştir.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse.Fail("Geçersiz oturum bilgisi.", StatusCodes.Status401Unauthorized));
        }

        var user = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        return Ok(ApiResponse<UserProfileDto>.Ok(user));
    }

    /// <summary>
    /// Giriş yapmış mevcut kullanıcının profil bilgilerini (Ad Soyad, Telefon) günceller (JWT Token gerektirir).
    /// </summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> UpdateProfile(
        [FromBody] UpdateProfileDto dto,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse.Fail("Geçersiz oturum bilgisi.", StatusCodes.Status401Unauthorized));
        }

        var updatedUser = await _authService.UpdateProfileAsync(userId, dto, cancellationToken);
        return Ok(ApiResponse<UserProfileDto>.Ok(updatedUser, "Profil bilgileriniz başarıyla güncellendi."));
    }

    /// <summary>
    /// Giriş yapmış kullanıcının şifresini değiştirir (JWT Token gerektirir).
    /// </summary>
    [HttpPut("change-password")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> ChangePassword(
        [FromBody] ChangePasswordDto dto,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse.Fail("Geçersiz oturum bilgisi.", StatusCodes.Status401Unauthorized));
        }

        await _authService.ChangePasswordAsync(userId, dto, cancellationToken);
        return Ok(ApiResponse.Ok("Şifreniz başarıyla güncellendi."));
    }
}
