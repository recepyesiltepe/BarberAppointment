namespace BarberAppointment.Services.DTOs;

/// <summary>
/// Telefon numarasının aktif SMS doğrulama durumunu bildiren DTO.
/// </summary>
public class SmsVerificationStatusDto
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string MaskedPhoneNumber { get; set; } = string.Empty;
    public bool HasPendingCode { get; set; }
    public int? RemainingSeconds { get; set; }
    public int? CooldownRemainingSeconds { get; set; }
    public int AttemptsLeft { get; set; }
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

