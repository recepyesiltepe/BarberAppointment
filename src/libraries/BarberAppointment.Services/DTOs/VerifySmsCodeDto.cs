namespace BarberAppointment.Services.DTOs;

/// <summary>
/// Telefon numarasına gönderilen SMS kodunu doğrulama isteği DTO'su.
/// </summary>
public class VerifySmsCodeDto
{
    /// <summary>
    /// Doğrulama yapılan telefon numarası.
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Kullanıcının girdiği 6 haneli doğrulama kodu.
    /// </summary>
    public string Code { get; set; } = string.Empty;
}

