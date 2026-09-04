using BarberAppointment.Core.Enums;

namespace BarberAppointment.Services.DTOs;

/// <summary>
/// Müşteri ve kullanıcılara güvenli şekilde servis edilen profil DTO'sudur.
/// Backend entity alanları (PasswordHash, PasswordSalt, dahili veritabanı bayrakları vb.) asla açığa çıkarılmaz.
/// </summary>
public class UserProfileDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public bool IsPhoneVerified { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime MemberSince { get; set; }
}

/// <summary>
/// Kullanıcının kendi profil bilgilerini güvenle güncellemesi için kullanılan DTO.
/// Yalnızca güvenli alanların (FullName, Phone) güncellenmesine izin verir.
/// </summary>
public class UpdateProfileDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
}
