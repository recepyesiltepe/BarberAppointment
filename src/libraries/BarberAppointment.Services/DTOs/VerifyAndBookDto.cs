namespace BarberAppointment.Services.DTOs;

/// <summary>
/// SMS doğrulama kodu ve randevu oluşturma bilgilerini birlikte taşıyan DTO (Ek Geliştirme 4).
/// Kod başarıyla doğrulandığında ilgili randevu akışı kesintisiz olarak tamamlanır.
/// </summary>
public class VerifyAndBookDto
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public CreateAppointmentDto Appointment { get; set; } = null!;
}

/// <summary>
/// SMS doğrulaması ve ardından oluşturulan randevunun sonucunu dönen DTO (Ek Geliştirme 4).
/// </summary>
public class VerifyAndBookResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public SmsVerificationResultDto SmsVerification { get; set; } = null!;
    public AppointmentDto? Appointment { get; set; }
}

