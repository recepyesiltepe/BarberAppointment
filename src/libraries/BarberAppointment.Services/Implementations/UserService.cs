using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Security;

namespace BarberAppointment.Services.Implementations;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public UserService(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await _unitOfWork.Users.GetAllAsync(cancellationToken);
        return users.Select(MapToDto).ToList();
    }

    public async Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id, cancellationToken);
        if (user == null)
            throw new NotFoundException($"ID: {id} olan kullanıcı bulunamadı.");

        return MapToDto(user);
    }

    public async Task<UserDto?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(email, cancellationToken);
        if (user == null)
            return null;

        return MapToDto(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new BusinessException("Kullanıcı adı boş olamaz.");

        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new BusinessException("E-posta adresi boş olamaz.");

        var existingUser = await _unitOfWork.Users.GetByEmailAsync(dto.Email.Trim(), cancellationToken);
        if (existingUser != null)
            throw new ConflictException($"'{dto.Email}' e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır.");

        _passwordHasher.CreatePasswordHash("Password123!", out var hash, out var salt);

        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = dto.Email.Trim(),
            Phone = dto.Phone?.Trim(),
            Role = dto.Role,
            PasswordHash = hash,
            PasswordSalt = salt,
            IsActive = true
        };

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(user);
    }

    public async Task SetActiveStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id, cancellationToken);
        if (user == null)
            throw new NotFoundException($"ID: {id} olan kullanıcı bulunamadı.");

        user.IsActive = isActive;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static UserDto MapToDto(User u) => new()
    {
        Id = u.Id,
        FullName = u.FullName,
        Email = u.Email,
        Phone = u.Phone,
        Role = u.Role,
        IsActive = u.IsActive
    };
}
