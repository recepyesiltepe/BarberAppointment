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

    // Şifre değişikliği e-posta doğrulama alanları
    public string? PasswordChangeToken { get; set; }
    public DateTime? PasswordChangeTokenExpiresAt { get; set; }
    public byte[]? PendingPasswordHash { get; set; }
    public byte[]? PendingPasswordSalt { get; set; }

    // Refresh Token alanları
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public DateTime? RefreshTokenCreatedAt { get; set; }
    public DateTime? RefreshTokenRevokedAt { get; set; }

    // Navigation properties
    public virtual Employee? Employee { get; set; }
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
