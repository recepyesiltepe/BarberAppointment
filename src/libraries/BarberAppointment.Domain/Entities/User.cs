using BarberAppointment.Core.Enums;

namespace BarberAppointment.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();
    public UserRole Role { get; set; } = UserRole.Customer;
    public bool IsPhoneVerified { get; set; } = false;
    public bool IsEmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationExpiresAt { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiresAt { get; set; }

    // Navigation properties
    public virtual Employee? Employee { get; set; }
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
