namespace BarberAppointment.Services.DTOs;

/// <summary>
/// SMS kod gönderme veya doğrulama işlemi sonucu DTO'su.
/// </summary>
public class SmsVerificationResultDto
{
    /// <summary>
    /// İşlemin başarılı olup olmadığı.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Kullanıcıya veya istemciye yönelik bilgilendirme mesajı.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Maskelenmiş telefon numarası (Örn: "0555***4567").
    /// </summary>
    public string? MaskedPhoneNumber { get; set; }

    /// <summary>
    /// Kodun son geçerlilik zamanı (UTC).
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// Kodun kaç saniye geçerli olduğu.
    /// </summary>
    public int? ExpirationSeconds { get; set; }

    /// <summary>
    /// Yeni bir kod istemeden önce beklenmesi gereken süre (saniye).
    /// </summary>
    public int? CooldownSeconds { get; set; }

    /// <summary>
    /// Numaranın doğrulanıp doğrulanmadığı (Verify adımı için).
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Doğrulanma zamanı (UTC).
    /// </summary>
    public DateTime? VerifiedAt { get; set; }

    /// <summary>
    /// Geliştirme, simülasyon ve test ortamlarında kolaylık sağlayan kod değeri.
    /// (Sadece simülasyon modu aktifken doldurulur).
    /// </summary>
    public string? SimulationCode { get; set; }

    /// <summary>
    /// Başarılı gönderim sonucu oluşturur.
    /// </summary>
    public static SmsVerificationResultDto Sent(string maskedPhone, DateTime expiresAt, int expSeconds, int cooldownSeconds, string? simulationCode = null)
    {
        return new SmsVerificationResultDto
        {
            Success = true,
            Message = "Doğrulama kodu başarıyla gönderildi.",
            MaskedPhoneNumber = maskedPhone,
            ExpiresAt = expiresAt,
            ExpirationSeconds = expSeconds,
            CooldownSeconds = cooldownSeconds,
            IsVerified = false,
            SimulationCode = simulationCode
        };
    }

    /// <summary>
    /// Başarılı doğrulama sonucu oluşturur.
    /// </summary>
    public static SmsVerificationResultDto Verified(string maskedPhone, DateTime verifiedAt)
    {
        return new SmsVerificationResultDto
        {
            Success = true,
            Message = "Telefon numarası başarıyla doğrulandı.",
            MaskedPhoneNumber = maskedPhone,
            IsVerified = true,
            VerifiedAt = verifiedAt
        };
    }

    /// <summary>
    /// Başarısız işlem sonucu oluşturur.
    /// </summary>
    public static SmsVerificationResultDto Failed(string message, int? cooldownSeconds = null)
    {
        return new SmsVerificationResultDto
        {
            Success = false,
            Message = message,
            CooldownSeconds = cooldownSeconds,
            IsVerified = false
        };
    }
}

