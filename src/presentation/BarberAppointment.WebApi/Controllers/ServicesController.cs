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
public class ServicesController : ControllerBase
{
    private readonly IServiceManagementService _serviceManagementService;

    public ServicesController(IServiceManagementService serviceManagementService)
    {
        _serviceManagementService = serviceManagementService;
    }

    /// <summary>
    /// Tüm hizmetleri listeler (Herkese açık).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ServiceDto>>>> GetAll(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var services = await _serviceManagementService.GetAllAsync(activeOnly, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ServiceDto>>.Ok(services, "Hizmetler başarıyla listelendi."));
    }

    /// <summary>
    /// ID'ye göre hizmet detayını getirir (Herkese açık).
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ServiceDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var service = await _serviceManagementService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<ServiceDto>.Ok(service!));
    }

    /// <summary>
    /// Yeni bir kuaför hizmeti oluşturur (Yalnızca Admin).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<ServiceDto>>> Create(
        [FromBody] CreateServiceDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _serviceManagementService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<ServiceDto>.Ok(created, "Hizmet başarıyla oluşturuldu.", StatusCodes.Status201Created));
    }

    /// <summary>
    /// Mevcut bir hizmetin bilgilerini günceller (Yalnızca Admin).
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<ServiceDto>>> Update(
        int id,
        [FromBody] UpdateServiceDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _serviceManagementService.UpdateAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<ServiceDto>.Ok(updated, "Hizmet başarıyla güncellendi."));
    }

    /// <summary>
    /// Hizmeti siler (Randevu geçmişi yoksa kalıcı siler, varsa pasife alır) (Yalnızca Admin).
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse>> Delete(int id, CancellationToken cancellationToken)
    {
        var isHardDeleted = await _serviceManagementService.DeleteAsync(id, cancellationToken);
        var message = isHardDeleted
            ? "Hizmet kalıcı olarak silindi."
            : "Hizmet geçmiş randevuları bulunduğu için pasife alındı.";

        return Ok(ApiResponse.Ok(message));
    }
}
