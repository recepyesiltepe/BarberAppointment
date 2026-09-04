namespace BarberAppointment.Services.Configurations;

/// <summary>
/// SMS doğrulama ve bildirim altyapısı yapılandırma modeli (Ek Geliştirme 3).
/// </summary>
public class SmsSettings
{
    public const string SectionName = "SmsSettings";

    /// <summary>
    /// SMS sağlayıcısı: "Mock", "NetGsm", "Twilio" vb. (Varsayılan: "Mock").
    /// </summary>
    public string Provider { get; set; } = "Mock";

    /// <summary>
    /// Gerçek SMS gönderiminin aktif olup olmadığı.
    /// false ise Mock / Simülasyon modu devrededir; kodlar loglanır ve test yanıtında döner.
    /// </summary>
    public bool EnableSmsSending { get; set; } = false;

    /// <summary>
    /// SMS sağlayıcısı API anahtarı (Varsa).
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// SMS sağlayıcısı API gizli anahtarı / şifresi (Varsa).
    /// </summary>
    public string? ApiSecret { get; set; }

    /// <summary>
    /// SMS başlığı / Alfanümerik Gönderici Başlığı (Örn: "BERBERAPPT").
    /// </summary>
    public string SenderTitle { get; set; } = "BERBERAPPT";

    /// <summary>
    /// Üretilen doğrulama kodunun geçerlilik süresi (dakika cinsinden, varsayılan: 3).
    /// </summary>
    public int CodeExpirationMinutes { get; set; } = 3;

    /// <summary>
    /// Yeni bir kod istemek için beklenmesi gereken minimum süre (saniye cinsinden, varsayılan: 60).
    /// </summary>
    public int CooldownSeconds { get; set; } = 60;

    /// <summary>
    /// Bir kod için izin verilen maksimum hatalı deneme sayısı (varsayılan: 3).
    /// Aşılırsa kod geçersiz kılınır.
    /// </summary>
    public int MaxVerificationAttempts { get; set; } = 3;

    /// <summary>
    /// Üretilecek OTP doğrulama kodunun hane sayısı (varsayılan: 6).
    /// </summary>
    public int CodeLength { get; set; } = 6;
}

