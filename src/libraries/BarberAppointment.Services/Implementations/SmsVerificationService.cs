using System.Collections.Concurrent;
using System.Security.Cryptography;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Services.Configurations;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BarberAppointment.Services.Implementations;

/// <summary>
/// Telefon numarası doğrulama kodu üretme, süre takibi, deneme hakkı ve doğrulama yönetim servisi (Ek Geliştirme 3 & 4).
/// Tüm iş mantığı ve veritabanı güncellemeleri servis katmanında yönetilir; controller'a sızdırılmaz.
/// </summary>
public class SmsVerificationService : ISmsVerificationService
{
    private readonly ISmsService _smsService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAppointmentService _appointmentService;
    private readonly SmsSettings _settings;
    private readonly ILogger<SmsVerificationService> _logger;

    // Aktif doğrulama oturumlarını telefon bazında saklayan thread-safe yapı (tüm oturumlar için ortak)
    private static readonly ConcurrentDictionary<string, VerificationSession> _sessions = new();

    public SmsVerificationService(
        ISmsService smsService,
        IUnitOfWork unitOfWork,
        IAppointmentService appointmentService,
        IOptions<SmsSettings> options,
        ILogger<SmsVerificationService> logger)
    {
        _smsService = smsService;
        _unitOfWork = unitOfWork;
        _appointmentService = appointmentService;
        _settings = options.Value ?? new SmsSettings();
        _logger = logger;
    }

    /// <summary>
    /// Belirtilen telefon numarasına yeni bir OTP doğrulama kodu üretip SMS olarak gönderir.
    /// </summary>
    public async Task<SmsVerificationResultDto> SendCodeAsync(string phoneNumber, CancellationToken cancellationToken = default)
    {
        var normalizedPhone = NormalizePhone(phoneNumber);
        var maskedPhone = MaskPhone(normalizedPhone);
        var now = DateTime.UtcNow;

        // 1. Cooldown (tekrar isteme bekleme süresi) kontrolü
        if (_sessions.TryGetValue(normalizedPhone, out var existingSession))
        {
            var elapsedSeconds = (now - existingSession.LastRequestedAtUtc).TotalSeconds;
            if (elapsedSeconds < _settings.CooldownSeconds)
            {
                var remainingCooldown = (int)Math.Ceiling(_settings.CooldownSeconds - elapsedSeconds);
                _logger.LogWarning(
                    "SMS doğrulama kodu cooldown engeline takıldı. Numara: {Phone}, Kalan Bekleme: {Seconds} sn",
                    maskedPhone, remainingCooldown);

                return SmsVerificationResultDto.Failed(
                    $"Yeni bir doğrulama kodu talep etmeden önce lütfen {remainingCooldown} saniye bekleyiniz.",
                    remainingCooldown);
            }
        }

        // 2. Kriptografik güvenli 6 haneli OTP kodu üretimi
        var code = GenerateOtpCode(_settings.CodeLength);
        var expiresAt = now.AddMinutes(_settings.CodeExpirationMinutes);
        var expirationSeconds = (int)(expiresAt - now).TotalSeconds;

        // 3. Oturumu kaydet/güncelle
        var session = new VerificationSession
        {
            PhoneNumber = normalizedPhone,
            Code = code,
            CreatedAtUtc = now,
            LastRequestedAtUtc = now,
            ExpiresAtUtc = expiresAt,
            AttemptsCount = 0,
            IsVerified = false,
            VerifiedAtUtc = null
        };

        _sessions.AddOrUpdate(normalizedPhone, session, (_, _) => session);

        // 4. SMS Servisi üzerinden gönder
        await _smsService.SendVerificationCodeAsync(normalizedPhone, code, _settings.CodeExpirationMinutes, cancellationToken);

        _logger.LogInformation(
            "SMS doğrulama kodu üretildi ve iletildi. Numara: {Phone}, Geçerlilik: {Minutes} dk",
            maskedPhone, _settings.CodeExpirationMinutes);

        // Simülasyon veya Mock modunda test kolaylığı için simulationCode yanıt olarak sağlanır
        var simulationCode = (!_settings.EnableSmsSending || _settings.Provider.Equals("Mock", StringComparison.OrdinalIgnoreCase))
            ? code
            : null;

        return SmsVerificationResultDto.Sent(
            maskedPhone,
            expiresAt,
            expirationSeconds,
            _settings.CooldownSeconds,
            simulationCode
        );
    }

    /// <summary>
    /// Kullanıcının girdiği doğrulama kodunu kontrol eder ve eşleşen kullanıcı varsa IsPhoneVerified = true yapar.
    /// </summary>
    public async Task<SmsVerificationResultDto> VerifyCodeAsync(string phoneNumber, string code, CancellationToken cancellationToken = default)
    {
        var normalizedPhone = NormalizePhone(phoneNumber);
        var maskedPhone = MaskPhone(normalizedPhone);
        var now = DateTime.UtcNow;

        if (!_sessions.TryGetValue(normalizedPhone, out var session))
        {
            return SmsVerificationResultDto.Failed(
                "Bu telefon numarası için aktif bir doğrulama kodu talebi bulunamadı. Lütfen önce kod isteyiniz.");
        }

        // Kod zaten doğrulanmış ve geçerliyse
        if (session.IsVerified)
        {
            return SmsVerificationResultDto.Verified(maskedPhone, session.VerifiedAtUtc ?? now);
        }

        // Süresi dolmuş mu?
        if (now > session.ExpiresAtUtc)
        {
            _sessions.TryRemove(normalizedPhone, out _);
            _logger.LogWarning("SMS doğrulama kodunun süresi dolmuş. Numara: {Phone}", maskedPhone);
            return SmsVerificationResultDto.Failed(
                "Doğrulama kodunun geçerlilik süresi dolmuştur. Lütfen yeni bir kod isteyiniz.");
        }

        // Deneme hakkı kontrolü
        session.AttemptsCount++;
        if (session.AttemptsCount > _settings.MaxVerificationAttempts)
        {
            _sessions.TryRemove(normalizedPhone, out _);
            _logger.LogWarning("SMS doğrulama kodu maksimum deneme hakkı aşıldı. Numara: {Phone}", maskedPhone);
            return SmsVerificationResultDto.Failed(
                "Maksimum hatalı deneme sayısı aşıldı. Güvenliğiniz nedeniyle kod iptal edildi. Lütfen yeni bir kod isteyiniz.");
        }

        // Kod eşleşiyor mu?
        if (!string.Equals(session.Code, code.Trim(), StringComparison.Ordinal))
        {
            var remainingAttempts = Math.Max(0, _settings.MaxVerificationAttempts - session.AttemptsCount);
            _logger.LogWarning(
                "Hatalı SMS kodu girildi. Numara: {Phone}, Kalan Deneme Hakkı: {Attempts}",
                maskedPhone, remainingAttempts);

            return SmsVerificationResultDto.Failed(
                $"Girdiğiniz doğrulama kodu hatalıdır. Kalan deneme hakkınız: {remainingAttempts}");
        }

        // Kod doğru -> Doğrulanmış olarak işaretle ve kodu tüket (replay engeli)
        session.IsVerified = true;
        session.VerifiedAtUtc = now;
        session.Code = string.Empty; // Tüketildi

        _logger.LogInformation("Telefon numarası başarıyla doğrulandı. Numara: {Phone}", maskedPhone);

        // Ek Geliştirme 4: Eşleşen kullanıcı varsa IsPhoneVerified = true olarak işaretle (Data katmanı)
        var allUsers = await _unitOfWork.Users.GetAllAsync(cancellationToken);
        var matchedUser = allUsers.FirstOrDefault(u => !string.IsNullOrEmpty(u.Phone) && NormalizePhone(u.Phone) == normalizedPhone);
        if (matchedUser != null)
        {
            matchedUser.IsPhoneVerified = true;
            _unitOfWork.Users.Update(matchedUser);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return SmsVerificationResultDto.Verified(maskedPhone, now);
    }

    /// <summary>
    /// Giriş yapmış kullanıcının profil telefonunu doğrular ve veritabanında günceller (Ek Geliştirme 4).
    /// </summary>
    public async Task<SmsVerificationResultDto> VerifyMyPhoneAsync(int userId, string phoneNumber, string code, CancellationToken cancellationToken = default)
    {
        var result = await VerifyCodeAsync(phoneNumber, code, cancellationToken);
        if (!result.Success)
        {
            return result;
        }

        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            user.Phone = phoneNumber.Trim();
            user.IsPhoneVerified = true;
            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        result.Message = "Telefon numaranız başarıyla doğrulandı ve profilinize kaydedildi.";
        return result;
    }

    /// <summary>
    /// SMS kodunu doğrular, kullanıcıyı günceller ve ardından randevuyu kesintisiz oluşturur (Ek Geliştirme 4).
    /// </summary>
    public async Task<VerifyAndBookResultDto> VerifyAndBookAsync(VerifyAndBookDto dto, int? authenticatedUserId = null, CancellationToken cancellationToken = default)
    {
        // 1. SMS Kodunu Doğrula
        var smsResult = await VerifyCodeAsync(dto.PhoneNumber, dto.Code, cancellationToken);
        if (!smsResult.Success)
        {
            return new VerifyAndBookResultDto
            {
                Success = false,
                Message = smsResult.Message,
                SmsVerification = smsResult
            };
        }

        // 2. Hedef kullanıcıyı doğrulanmış olarak güncelle
        int targetUserId = 0;
        if (authenticatedUserId.HasValue && authenticatedUserId.Value > 0)
        {
            targetUserId = authenticatedUserId.Value;
        }
        else if (dto.Appointment.UserId > 0)
        {
            targetUserId = dto.Appointment.UserId;
        }

        if (targetUserId > 0)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(targetUserId, cancellationToken);
            if (user != null)
            {
                user.Phone = dto.PhoneNumber.Trim();
                user.IsPhoneVerified = true;
                _unitOfWork.Users.Update(user);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

        // 3. Randevuyu Otomatik Oluştur
        dto.Appointment.UserId = targetUserId > 0 ? targetUserId : dto.Appointment.UserId;
        var appointment = await _appointmentService.CreateAsync(dto.Appointment, cancellationToken);

        return new VerifyAndBookResultDto
        {
            Success = true,
            Message = "Telefon numaranız başarıyla doğrulandı ve randevunuz oluşturuldu.",
            SmsVerification = smsResult,
            Appointment = appointment
        };
    }

    /// <summary>
    /// Belirtilen telefon numarasının aktif doğrulama durumunu döner.
    /// </summary>
    public Task<SmsVerificationStatusDto> GetStatusAsync(string phoneNumber, CancellationToken cancellationToken = default)
    {
        var normalizedPhone = NormalizePhone(phoneNumber);
        var maskedPhone = MaskPhone(normalizedPhone);
        var now = DateTime.UtcNow;

        if (!_sessions.TryGetValue(normalizedPhone, out var session))
        {
            return Task.FromResult(new SmsVerificationStatusDto
            {
                PhoneNumber = normalizedPhone,
                MaskedPhoneNumber = maskedPhone,
                HasPendingCode = false,
                RemainingSeconds = null,
                CooldownRemainingSeconds = null,
                AttemptsLeft = _settings.MaxVerificationAttempts,
                IsVerified = false,
                VerifiedAt = null
            });
        }

        var remainingSeconds = session.ExpiresAtUtc > now
            ? (int)Math.Ceiling((session.ExpiresAtUtc - now).TotalSeconds)
            : 0;

        var elapsedCooldown = (now - session.LastRequestedAtUtc).TotalSeconds;
        var cooldownRemaining = elapsedCooldown < _settings.CooldownSeconds
            ? (int)Math.Ceiling(_settings.CooldownSeconds - elapsedCooldown)
            : 0;

        var attemptsLeft = Math.Max(0, _settings.MaxVerificationAttempts - session.AttemptsCount);

        return Task.FromResult(new SmsVerificationStatusDto
        {
            PhoneNumber = normalizedPhone,
            MaskedPhoneNumber = maskedPhone,
            HasPendingCode = remainingSeconds > 0 && !session.IsVerified,
            RemainingSeconds = remainingSeconds > 0 ? remainingSeconds : null,
            CooldownRemainingSeconds = cooldownRemaining > 0 ? cooldownRemaining : null,
            AttemptsLeft = attemptsLeft,
            IsVerified = session.IsVerified,
            VerifiedAt = session.VerifiedAtUtc
        });
    }

    /// <summary>
    /// Belirtilen telefon numarasının doğrulanıp doğrulanmadığını kontrol eder.
    /// </summary>
    public Task<bool> IsPhoneVerifiedAsync(string phoneNumber, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizePhone(phoneNumber);
        return Task.FromResult(_sessions.TryGetValue(normalized, out var session) && session.IsVerified);
    }

    private static string GenerateOtpCode(int length)
    {
        var min = (int)Math.Pow(10, length - 1);
        var max = (int)Math.Pow(10, length);
        return RandomNumberGenerator.GetInt32(min, max).ToString();
    }

    public static string NormalizePhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return string.Empty;

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("90") && digits.Length == 12)
            digits = digits[2..];
        if (digits.StartsWith("0") && digits.Length == 11)
            digits = digits[1..];

        return digits.Length == 10 ? "0" + digits : digits;
    }

    public static string MaskPhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length < 7)
            return phone;

        var start = phone[..4];
        var end = phone[^3..];
        return $"{start}***{end}";
    }

    private class VerificationSession
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime LastRequestedAtUtc { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public int AttemptsCount { get; set; }
        public bool IsVerified { get; set; }
        public DateTime? VerifiedAtUtc { get; set; }
    }
}
