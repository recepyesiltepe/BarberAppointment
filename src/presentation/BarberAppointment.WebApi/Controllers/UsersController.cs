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
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Tüm kullanıcıları listeler (Yalnızca Admin).
    /// </summary>
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _userService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<UserDto>>.Ok(users, "Kullanıcılar başarıyla listelendi."));
    }

    /// <summary>
    /// ID'ye göre kullanıcı detayını getirir (Yalnızca Admin).
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        if (user == null)
        {
            return NotFound(ApiResponse.Fail($"ID: {id} olan kullanıcı bulunamadı.", StatusCodes.Status404NotFound));
        }
        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    /// <summary>
    /// Yeni bir kullanıcı oluşturur (Yalnızca Admin).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create([FromBody] CreateUserDto dto, CancellationToken cancellationToken)
    {
        var created = await _userService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<UserDto>.Ok(created, "Kullanıcı başarıyla oluşturuldu.", StatusCodes.Status201Created));
    }
}
