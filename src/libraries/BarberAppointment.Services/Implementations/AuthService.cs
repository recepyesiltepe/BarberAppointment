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
            _logger.LogWarning("Mevcut e-posta ile kayıt denemesi: Email={Email}", dto.Email);
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

        _logger.LogInformation("Yeni kullanıcı kaydı oluşturuldu: UserId={UserId}, Email={Email}, Role={Role}", user.Id, user.Email, user.Role);

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
            _logger.LogWarning("Başarısız giriş denemesi: Kayıtlı olmayan e-posta. Email={Email}", normalizedEmail);
            throw new BusinessException("E-posta adresi veya şifre hatalı.");
        }

        // 2. Aktiflik kontrolü
        if (!user.IsActive)
        {
            _logger.LogWarning("Başarısız giriş denemesi: Pasif hesap. Email={Email}, UserId={UserId}", normalizedEmail, user.Id);
            throw new BusinessException("Kullanıcı hesabı pasif durumdadır.");
        }

        // 3. Şifre doğrulaması
        var isPasswordValid = _passwordHasher.VerifyPasswordHash(dto.Password, user.PasswordHash, user.PasswordSalt);
        if (!isPasswordValid)
        {
            _logger.LogWarning("Başarısız giriş denemesi: Hatalı şifre. Email={Email}, UserId={UserId}", normalizedEmail, user.Id);
            throw new BusinessException("E-posta adresi veya şifre hatalı.");
        }

        // 4. E-Posta doğrulama kontrolü (Kullanıcı e-posta adresini onaylamadan sisteme giriş yapamaz)
        if (!user.IsEmailVerified)
        {
            _logger.LogWarning("Başarısız giriş denemesi: Doğrulanmamış e-posta. Email={Email}, UserId={UserId}", normalizedEmail, user.Id);
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

        // 6. JWT Access Token ve Refresh Token üretimi
        var token = _jwtTokenService.GenerateToken(user, employeeId);
        var expiresIn = _jwtTokenService.GetExpirationSeconds();
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        var refreshExpiresDays = _jwtTokenService.GetRefreshTokenExpirationDays();

        user.RefreshToken = refreshToken;
        user.RefreshTokenCreatedAt = DateTime.UtcNow;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshExpiresDays);
        user.RefreshTokenRevokedAt = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Kullanıcı başarıyla giriş yaptı: UserId={UserId}, Email={Email}, Role={Role}", user.Id, user.Email, user.Role);

        return new AuthResponseDto
        {
            AccessToken = token,
            TokenType = "Bearer",
            ExpiresIn = expiresIn,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = user.RefreshTokenExpiresAt,
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
            _logger.LogWarning("Şifre değişikliği engellendi: Mevcut şifre hatalı. UserId={UserId}", userId);
            throw new BusinessException("Mevcut şifreniz hatalı.");
        }

        // 2. Yeni şifre mevcut şifreyle aynı olamaz
        if (dto.NewPassword == dto.CurrentPassword)
        {
            _logger.LogWarning("Şifre değişikliği engellendi: Yeni şifre mevcut şifreyle aynı. UserId={UserId}", userId);
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

        _logger.LogInformation("Kullanıcı şifre değişikliği süreci başlattı: UserId={UserId}", userId);

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
            _logger.LogWarning("Şifre değişikliği onaylanamadı: Hatalı doğrulama kodu. UserId={UserId}", userId);
            throw new BusinessException("Geçersiz veya hatalı doğrulama kodu.");
        }

        // 2. Süre kontrolü (15 dakika)
        if (user.PasswordChangeTokenExpiresAt.HasValue && user.PasswordChangeTokenExpiresAt.Value < DateTime.UtcNow)
        {
            _logger.LogWarning("Şifre değişikliği onaylanamadı: Doğrulama kodunun süresi dolmuş. UserId={UserId}", userId);
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

        _logger.LogInformation("Kullanıcı şifresini başarıyla güncelledi: UserId={UserId}", userId);

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

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.RefreshToken))
        {
            throw new BusinessException("Refresh token boş olamaz.");
        }

        var user = await _unitOfWork.Users.GetByRefreshTokenAsync(dto.RefreshToken.Trim(), cancellationToken);
        if (user == null)
        {
            _logger.LogWarning("Başarısız token rotasyonu: Refresh token bulunamadı.");
            throw new BusinessException("Geçersiz veya süresi dolmuş refresh token.");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Başarısız token rotasyonu: Pasif kullanıcı. UserId={UserId}", user.Id);
            throw new BusinessException("Hesabınız devre dışı bırakılmıştır.");
        }

        if (user.RefreshTokenRevokedAt.HasValue)
        {
            _logger.LogWarning("Başarısız token rotasyonu: İptal edilmiş refresh token. UserId={UserId}", user.Id);
            throw new BusinessException("Bu refresh token iptal edilmiştir. Lütfen yeniden giriş yapınız.");
        }

        if (user.RefreshTokenExpiresAt.HasValue && user.RefreshTokenExpiresAt.Value < DateTime.UtcNow)
        {
            _logger.LogWarning("Başarısız token rotasyonu: Süresi dolmuş refresh token. UserId={UserId}", user.Id);
            throw new BusinessException("Refresh token süresi dolmuştur. Lütfen yeniden giriş yapınız.");
        }

        int? employeeId = user.Employee?.Id;
        if (!employeeId.HasValue && user.Role == Core.Enums.UserRole.Employee)
        {
            var employees = await _unitOfWork.Employees.GetAllAsync(cancellationToken);
            var emp = employees.FirstOrDefault(e => e.UserId == user.Id);
            employeeId = emp?.Id;
        }

        // Token Rotasyonu: Yeni Access Token ve yeni Refresh Token üretimi
        var newAccessToken = _jwtTokenService.GenerateToken(user, employeeId);
        var expiresIn = _jwtTokenService.GetExpirationSeconds();
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var refreshExpiresDays = _jwtTokenService.GetRefreshTokenExpirationDays();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenCreatedAt = DateTime.UtcNow;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshExpiresDays);
        user.RefreshTokenRevokedAt = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Token rotasyonu başarıyla gerçekleştirildi: UserId={UserId}", user.Id);

        return new AuthResponseDto
        {
            AccessToken = newAccessToken,
            TokenType = "Bearer",
            ExpiresIn = expiresIn,
            RefreshToken = newRefreshToken,
            RefreshTokenExpiresAt = user.RefreshTokenExpiresAt,
            User = MapToProfileDto(user),
            RequiresEmailVerification = false
        };
    }

    public async Task RevokeTokenAsync(RevokeTokenRequestDto dto, int? userId = null, CancellationToken cancellationToken = default)
    {
        User? user = null;

        if (userId.HasValue)
        {
            user = await _unitOfWork.Users.GetByIdAsync(userId.Value, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(dto.RefreshToken))
        {
            user = await _unitOfWork.Users.GetByRefreshTokenAsync(dto.RefreshToken.Trim(), cancellationToken);
        }

        if (user != null)
        {
            user.RefreshTokenRevokedAt = DateTime.UtcNow;
            user.RefreshToken = null;
            user.RefreshTokenExpiresAt = null;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
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
