namespace BarberAppointment.Services.DTOs;

/// <summary>
/// Telefon numarasına SMS doğrulama kodu gönderme isteği DTO'su.
/// </summary>
public class SendSmsVerificationDto
{
    /// <summary>
    /// Doğrulama kodu gönderilecek telefon numarası (Örn: "05551234567" veya "+905551234567").
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;
}

