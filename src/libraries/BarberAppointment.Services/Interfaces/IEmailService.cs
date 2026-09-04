using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

/// <summary>
/// E-posta gönderim altyapısı arayüzü (Ek Geliştirme 1).
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Genel amaçlı e-posta gönderir.
    /// </summary>
    /// <param name="toEmail">Alıcı e-posta adresi.</param>
    /// <param name="subject">E-posta konusu.</param>
    /// <param name="body">E-posta içeriği (HTML veya düz metin).</param>
    /// <param name="isHtml">İçeriğin HTML olup olmadığı.</param>
    /// <param name="cancellationToken">İptal belirteci.</param>
    /// <returns>E-posta gönderiminin veya simülasyonunun başarılı olup olmadığı.</returns>
    Task<bool> SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Yeni randevu oluşturulduğunda müşteriye onay e-postası gönderir.
    /// </summary>
    Task<bool> SendAppointmentConfirmationAsync(AppointmentDto appointment, string toEmail, CancellationToken cancellationToken = default);

    /// <summary>
    /// Randevu iptal edildiğinde müşteriye bilgilendirme e-postası gönderir.
    /// </summary>
    Task<bool> SendAppointmentCancellationAsync(AppointmentDto appointment, string toEmail, CancellationToken cancellationToken = default);

    /// <summary>
    /// Randevu saati güncellendiğinde müşteriye bilgilendirme e-postası gönderir.
    /// </summary>
    Task<bool> SendAppointmentRescheduledAsync(AppointmentDto appointment, string toEmail, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcı şifresi başarıyla değiştirildiğinde güvenlik bilgilendirme e-postası gönderir (Ek Geliştirme 6).
    /// </summary>
    Task<bool> SendPasswordChangedNotificationAsync(string toEmail, string userName, DateTime changedAt, string? ipAddress = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Yeni kullanıcı kayıt olduğunda hoş geldin ve e-posta doğrulama linki/token'ı iletir.
    /// </summary>
    Task<bool> SendWelcomeAndEmailVerificationAsync(string toEmail, string fullName, string token, CancellationToken cancellationToken = default);

    /// <summary>
    /// Şifresini unutan kullanıcıya tek kullanımlık süreli şifre sıfırlama linki/token'ı iletir.
    /// </summary>
    Task<bool> SendPasswordResetEmailAsync(string toEmail, string fullName, string token, CancellationToken cancellationToken = default);
}

