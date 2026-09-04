namespace BarberAppointment.Services.Interfaces;

/// <summary>
/// SMS gönderim altyapısı arayüzü (Ek Geliştirme 3).
/// Gerçek SMS sağlayıcısı (NetGsm, Twilio vb.) veya Mock servis tarafından uygulanabilir.
/// </summary>
public interface ISmsService
{
    /// <summary>
    /// Belirtilen telefon numarasına metin SMS'i gönderir.
    /// </summary>
    /// <param name="phoneNumber">Alıcı telefon numarası.</param>
    /// <param name="message">Gönderilecek metin.</param>
    /// <param name="cancellationToken">İptal belirteci.</param>
    /// <returns>SMS gönderiminin veya simülasyonunun başarılı olup olmadığı.</returns>
    Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Belirtilen telefon numarasına şablonlu OTP doğrulama SMS'i gönderir.
    /// </summary>
    /// <param name="phoneNumber">Alıcı telefon numarası.</param>
    /// <param name="code">Üretilen doğrulama kodu (Örn: "123456").</param>
    /// <param name="expirationMinutes">Kodun geçerlilik süresi (dakika).</param>
    /// <param name="cancellationToken">İptal belirteci.</param>
    Task<bool> SendVerificationCodeAsync(string phoneNumber, string code, int expirationMinutes = 3, CancellationToken cancellationToken = default);
}

