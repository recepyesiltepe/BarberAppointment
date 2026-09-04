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
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    /// <summary>
    /// Tüm personeli listeler (Herkese açık).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeDto>>>> GetAll(
        [FromQuery] bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        var employees = await _employeeService.GetAllAsync(activeOnly, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EmployeeDto>>.Ok(employees, "Personel listesi başarıyla getirildi."));
    }

    /// <summary>
    /// ID'ye göre personel detayını getirir (Herkese açık).
    /// </summary>
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var employee = await _employeeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(employee!));
    }

    /// <summary>
    /// Belirtilen hizmeti sunan personelleri listeler (Herkese açık).
    /// </summary>
    [HttpGet("by-service/{serviceId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EmployeeDto>>>> GetByServiceId(
        int serviceId,
        CancellationToken cancellationToken)
    {
        var employees = await _employeeService.GetByServiceIdAsync(serviceId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EmployeeDto>>.Ok(employees));
    }

    /// <summary>
    /// Yeni bir personel kaydı oluşturur (Yalnızca Admin).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Create(
        [FromBody] CreateEmployeeDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _employeeService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(
            nameof(GetById),
            new { id = created.Id },
            ApiResponse<EmployeeDto>.Ok(created, "Personel başarıyla oluşturuldu.", StatusCodes.Status201Created));
    }

    /// <summary>
    /// Mevcut bir personelin bilgilerini günceller (Yalnızca Admin).
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Update(
        int id,
        [FromBody] UpdateEmployeeDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _employeeService.UpdateAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(updated, "Personel başarıyla güncellendi."));
    }

    /// <summary>
    /// Personeli siler/pasife alır (Yalnızca Admin).
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse>> Delete(int id, CancellationToken cancellationToken)
    {
        await _employeeService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Personel başarıyla silindi (pasife alındı)."));
    }

    /// <summary>
    /// Personele hizmet yetkisi atar (Yalnızca Admin).
    /// </summary>
    [HttpPost("{id:int}/services")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse>> AssignServices(
        int id,
        [FromBody] AssignServicesDto dto,
        CancellationToken cancellationToken)
    {
        await _employeeService.AssignServicesAsync(id, dto.ServiceIds, cancellationToken);
        return Ok(ApiResponse.Ok("Hizmetler personele başarıyla atandı."));
    }
}
