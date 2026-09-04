using System.Security.Cryptography;
using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Security;
using Microsoft.Extensions.Logging;

namespace BarberAppointment.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IEmailService emailService,
        ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _emailService = emailService;
        _logger = logger;
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

        // 3. Kullanıcı kaydı oluşturma ve doğrulama token'ı üretimi
        var verificationToken = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            Phone = dto.Phone?.Trim(),
            Role = UserRole.Customer, // Kayıt olan tüm kullanıcılar daima Customer rolündedir
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            IsActive = true,
            IsEmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Kayıt sonrası Hoş Geldin ve E-Posta Doğrulama e-postası tetikle
        try
        {
            await _emailService.SendWelcomeAndEmailVerificationAsync(
                user.Email,
                user.FullName,
                verificationToken,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AuthService] Hoş geldin e-postası iletilemedi: {Email}", user.Email);
        }

        // 4. Kayıt sonrası ilk giriş için e-posta onayı zorunludur; bu nedenle kayıt anında JWT token üretilmez.
        return new AuthResponseDto
        {
            AccessToken = string.Empty,
            TokenType = "Bearer",
            ExpiresIn = 0,
            User = MapToProfileDto(user),
            SimulationToken = verificationToken,
            RequiresEmailVerification = true
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

        // 4. E-Posta doğrulama kontrolü (Kullanıcı e-posta adresini onaylamadan sisteme giriş yapamaz)
        if (!user.IsEmailVerified)
        {
            throw new BusinessException("Giriş yapabilmek için lütfen önce e-posta adresinizi doğrulayınız. E-postanıza gönderilen 6 haneli doğrulama kodunu kullanınız.");
        }

        // 5. Personel kaydı bağlı mı kontrol et
        int? employeeId = user.Employee?.Id;
        if (!employeeId.HasValue && user.Role == Core.Enums.UserRole.Employee)
        {
            var employees = await _unitOfWork.Employees.GetAllAsync(cancellationToken);
            var emp = employees.FirstOrDefault(e => e.UserId == user.Id);
            employeeId = emp?.Id;
        }

        // 6. JWT Access Token üretimi
        var token = _jwtTokenService.GenerateToken(user, employeeId);
        var expiresIn = _jwtTokenService.GetExpirationSeconds();

        return new AuthResponseDto
        {
            AccessToken = token,
            TokenType = "Bearer",
            ExpiresIn = expiresIn,
            User = MapToProfileDto(user),
            RequiresEmailVerification = false
        };
    }

    public async Task<UserProfileDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"ID: {userId} olan kullanıcı bulunamadı.");
        }

        return MapToProfileDto(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"ID: {userId} olan kullanıcı bulunamadı.");
        }

        user.FullName = dto.FullName.Trim();
        var newPhone = dto.Phone?.Trim();
        if (!string.IsNullOrEmpty(newPhone) && user.Phone != newPhone)
        {
            user.Phone = newPhone;
            user.IsPhoneVerified = false;
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToProfileDto(user);
    }

    public async Task<ChangePasswordResponseDto> ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"ID: {userId} olan kullanıcı bulunamadı.");
        }

        // 1. Mevcut şifreyi doğrula
        var isOldPasswordValid = _passwordHasher.VerifyPasswordHash(dto.CurrentPassword, user.PasswordHash, user.PasswordSalt);
        if (!isOldPasswordValid)
        {
            throw new BusinessException("Mevcut şifreniz hatalı.");
        }

        // 2. Yeni şifre mevcut şifreyle aynı olamaz
        if (dto.NewPassword == dto.CurrentPassword)
        {
            throw new BusinessException("Yeni şifre mevcut şifrenizle aynı olamaz.");
        }

        // 3. Yeni şifrenin hash'ini beklemede tut (kod doğrulanana kadar uygulanmaz)
        _passwordHasher.CreatePasswordHash(dto.NewPassword, out var pendingHash, out var pendingSalt);

        // 4. 6 haneli doğrulama kodu üret ve 15 dakika geçerli olacak şekilde kaydet
        var verificationCode = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        user.PendingPasswordHash = pendingHash;
        user.PendingPasswordSalt = pendingSalt;
        user.PasswordChangeToken = verificationCode;
        user.PasswordChangeTokenExpiresAt = DateTime.UtcNow.AddMinutes(15);

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // 5. Doğrulama kodunu e-posta ile gönder
        try
        {
            await _emailService.SendPasswordChangeVerificationAsync(user.Email, user.FullName, verificationCode, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AuthService] Şifre değişikliği doğrulama e-postası iletilemedi: {Email}", user.Email);
        }

        return new ChangePasswordResponseDto
        {
            RequiresVerification = true,
            Message = "Şifre değişikliğini onaylamak için e-posta adresinize gönderilen 6 haneli kodu giriniz. Kod 15 dakika geçerlidir.",
            SimulationToken = verificationCode
        };
    }

    public async Task ConfirmPasswordChangeAsync(int userId, ConfirmPasswordChangeDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"ID: {userId} olan kullanıcı bulunamadı.");
        }

        // 1. Bekleyen token kontrolü
        if (string.IsNullOrWhiteSpace(user.PasswordChangeToken) || user.PasswordChangeToken != dto.VerificationCode.Trim())
        {
            throw new BusinessException("Geçersiz veya hatalı doğrulama kodu.");
        }

        // 2. Süre kontrolü (15 dakika)
        if (user.PasswordChangeTokenExpiresAt.HasValue && user.PasswordChangeTokenExpiresAt.Value < DateTime.UtcNow)
        {
            throw new BusinessException("Doğrulama kodunun süresi dolmuş (15 dakika). Lütfen şifre değiştirme işlemini yeniden başlatınız.");
        }

        // 3. Bekleyen hash'in mevcut olduğunu doğrula
        if (user.PendingPasswordHash == null || user.PendingPasswordSalt == null)
        {
            throw new BusinessException("Bekleyen şifre değişikliği bulunamadı. Lütfen işlemi yeniden başlatınız.");
        }

        // 4. Yeni şifreyi uygula ve tüm bekleyen alanları temizle
        user.PasswordHash = user.PendingPasswordHash;
        user.PasswordSalt = user.PendingPasswordSalt;
        user.PendingPasswordHash = null;
        user.PendingPasswordSalt = null;
        user.PasswordChangeToken = null;
        user.PasswordChangeTokenExpiresAt = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // 5. Güvenlik bildirim e-postası gönder
        try
        {
            await _emailService.SendPasswordChangedNotificationAsync(
                user.Email,
                user.FullName,
                DateTime.UtcNow,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AuthService] Şifre değişikliği bildirim e-postası gönderilemedi: {Email}", user.Email);
        }
    }

    public async Task<EmailVerificationResponseDto> VerifyEmailAsync(VerifyEmailDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"'{dto.Email}' adresine sahip kullanıcı bulunamadı.");
        }

        if (user.IsEmailVerified)
        {
            return new EmailVerificationResponseDto
            {
                Success = true,
                Message = "E-posta adresiniz zaten doğrulanmıştır."
            };
        }

        if (string.IsNullOrWhiteSpace(user.EmailVerificationToken) || user.EmailVerificationToken != dto.Token.Trim())
        {
            throw new BusinessException("Geçersiz veya hatalı doğrulama kodu.");
        }

        if (user.EmailVerificationExpiresAt.HasValue && user.EmailVerificationExpiresAt.Value < DateTime.UtcNow)
        {
            throw new BusinessException("Doğrulama kodunun süresi dolmuş. Lütfen yeni bir doğrulama e-postası talep ediniz.");
        }

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiresAt = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new EmailVerificationResponseDto
        {
            Success = true,
            Message = "E-posta adresiniz başarıyla doğrulandı! Artık şifrenizle giriş yapabilirsiniz."
        };
    }

    public async Task<EmailVerificationResponseDto> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user == null)
        {
            return new EmailVerificationResponseDto
            {
                Success = true,
                Message = "Eğer belirtilen e-posta adresi kayıtlı ise doğrulama bağlantısı iletildi."
            };
        }

        if (user.IsEmailVerified)
        {
            return new EmailVerificationResponseDto
            {
                Success = true,
                Message = "E-posta adresiniz zaten doğrulanmıştır."
            };
        }

        var newToken = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        user.EmailVerificationToken = newToken;
        user.EmailVerificationExpiresAt = DateTime.UtcNow.AddHours(24);

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendWelcomeAndEmailVerificationAsync(user.Email, user.FullName, newToken, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AuthService] Yeniden doğrulama e-postası iletilemedi: {Email}", user.Email);
        }

        return new EmailVerificationResponseDto
        {
            Success = true,
            Message = "Yeni doğrulama kodu ve bağlantısı e-posta adresinize gönderildi.",
            SimulationToken = newToken
        };
    }

    public async Task<ForgotPasswordResponseDto> ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user == null)
        {
            return new ForgotPasswordResponseDto
            {
                Success = true,
                Message = "Eğer bu e-posta adresi sistemimizde kayıtlı ise şifre sıfırlama bağlantısı iletildi."
            };
        }

        if (!user.IsActive)
        {
            throw new BusinessException("Hesabınız devre dışı bırakılmıştır.");
        }

        var resetToken = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        user.PasswordResetToken = resetToken;
        user.PasswordResetExpiresAt = DateTime.UtcNow.AddMinutes(30);

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.FullName, resetToken, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AuthService] Şifre sıfırlama e-postası iletilemedi: {Email}", user.Email);
        }

        return new ForgotPasswordResponseDto
        {
            Success = true,
            Message = "Şifre sıfırlama bağlantısı ve kodu e-posta adresinize iletildi.",
            SimulationToken = resetToken
        };
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException($"'{dto.Email}' adresine sahip kullanıcı bulunamadı.");
        }

        if (string.IsNullOrWhiteSpace(user.PasswordResetToken) || user.PasswordResetToken != dto.Token.Trim())
        {
            throw new BusinessException("Geçersiz veya hatalı şifre sıfırlama kodu.");
        }

        if (user.PasswordResetExpiresAt.HasValue && user.PasswordResetExpiresAt.Value < DateTime.UtcNow)
        {
            throw new BusinessException("Şifre sıfırlama kodunun süresi dolmuş (30 dakika). Lütfen tekrar talep ediniz.");
        }

        _passwordHasher.CreatePasswordHash(dto.NewPassword, out var newHash, out var newSalt);
        user.PasswordHash = newHash;
        user.PasswordSalt = newSalt;
        user.PasswordResetToken = null;
        user.PasswordResetExpiresAt = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendPasswordChangedNotificationAsync(
                user.Email,
                user.FullName,
                DateTime.UtcNow,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AuthService] Şifre sıfırlama bildirim e-postası iletilemedi: {Email}", user.Email);
        }
    }

    private static UserProfileDto MapToProfileDto(User u) => new()
    {
        Id = u.Id,
        FullName = u.FullName,
        Email = u.Email,
        Phone = u.Phone,
        Role = u.Role,
        RoleName = u.Role switch
        {
            Core.Enums.UserRole.Admin => "Admin",
            Core.Enums.UserRole.Employee => "Employee",
            _ => "Customer"
        },
        IsPhoneVerified = u.IsPhoneVerified,
        IsEmailVerified = u.IsEmailVerified,
        MemberSince = u.CreatedAt
    };
}
