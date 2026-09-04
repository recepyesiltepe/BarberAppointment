using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Security;

namespace BarberAppointment.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        // 1. E-posta tekillik kontrolü
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(dto.Email.Trim().ToLowerInvariant(), cancellationToken);
        if (existingUser != null)
        {
            throw new ConflictException($"'{dto.Email}' e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır.");
        }

        // 2. Şifre hashleme
        _passwordHasher.CreatePasswordHash(dto.Password, out var passwordHash, out var passwordSalt);

        // 3. Kullanıcı kaydı oluşturma
        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            Phone = dto.Phone?.Trim(),
            Role = dto.Role,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            IsActive = true
        };

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // 4. JWT Access Token üretimi
        var token = _jwtTokenService.GenerateToken(user);
        var expiresIn = _jwtTokenService.GetExpirationSeconds();

        return new AuthResponseDto
        {
            AccessToken = token,
            TokenType = "Bearer",
            ExpiresIn = expiresIn,
            User = MapToDto(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        // 1. Kullanıcıyı e-posta ile bul
        var user = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user == null)
        {
            throw new BusinessException("E-posta adresi veya şifre hatalı.");
        }

        // 2. Aktiflik kontrolü
        if (!user.IsActive)
        {
            throw new BusinessException("Kullanıcı hesabı pasif durumdadır.");
        }

        // 3. Şifre doğrulaması
        var isPasswordValid = _passwordHasher.VerifyPasswordHash(dto.Password, user.PasswordHash, user.PasswordSalt);
        if (!isPasswordValid)
        {
            throw new BusinessException("E-posta adresi veya şifre hatalı.");
        }

        // 4. Personel kaydı bağlı mı kontrol et
        int? employeeId = user.Employee?.Id;
        if (!employeeId.HasValue && user.Role == Core.Enums.UserRole.Employee)
        {
            var employees = await _unitOfWork.Employees.GetAllAsync(cancellationToken);
            var emp = employees.FirstOrDefault(e => e.UserId == user.Id);
            employeeId = emp?.Id;
        }

        // 5. JWT Access Token üretimi
        var token = _jwtTokenService.GenerateToken(user, employeeId);
        var expiresIn = _jwtTokenService.GetExpirationSeconds();

        return new AuthResponseDto
        {
            AccessToken = token,
            TokenType = "Bearer",
            ExpiresIn = expiresIn,
            User = MapToDto(user)
        };
    }

    public async Task<UserDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"ID: {userId} olan kullanıcı bulunamadı.");
        }

        return MapToDto(user);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"ID: {userId} olan kullanıcı bulunamadı.");
        }

        var isOldPasswordValid = _passwordHasher.VerifyPasswordHash(dto.CurrentPassword, user.PasswordHash, user.PasswordSalt);
        if (!isOldPasswordValid)
        {
            throw new BusinessException("Mevcut şifreniz hatalı.");
        }

        _passwordHasher.CreatePasswordHash(dto.NewPassword, out var newHash, out var newSalt);
        user.PasswordHash = newHash;
        user.PasswordSalt = newSalt;

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
        IsActive = u.IsActive,
        IsPhoneVerified = u.IsPhoneVerified
    };
}
