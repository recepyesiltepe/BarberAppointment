using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

/// <summary>
/// Telefon numarası doğrulama kodu üretme, süre takibi, deneme hakkı ve doğrulama yönetim servisi arayüzü (Ek Geliştirme 3 & 4).
/// </summary>
public interface ISmsVerificationService
{
    /// <summary>
    /// Belirtilen telefon numarasına yeni bir OTP doğrulama kodu üretip SMS olarak gönderir.
    /// Cooldown (tekrar isteme) süresini kontrol eder.
    /// </summary>
    Task<SmsVerificationResultDto> SendCodeAsync(string phoneNumber, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının girdiği doğrulama kodunu kontrol eder.
    /// Doğruysa numarayı doğrulanmış işaretler; sistemde eşleşen kullanıcı varsa IsPhoneVerified = true yapar.
    /// </summary>
    Task<SmsVerificationResultDto> VerifyCodeAsync(string phoneNumber, string code, CancellationToken cancellationToken = default);

    /// <summary>
    /// Giriş yapmış kullanıcının profil telefonunu doğrular, günceller ve IsPhoneVerified = true olarak işaretler.
    /// </summary>
    Task<SmsVerificationResultDto> VerifyMyPhoneAsync(int userId, string phoneNumber, string code, CancellationToken cancellationToken = default);

    /// <summary>
    /// SMS kodunu doğrular, kullanıcıyı günceller ve ardından randevuyu oluşturur (Ek Geliştirme 4).
    /// </summary>
    Task<VerifyAndBookResultDto> VerifyAndBookAsync(VerifyAndBookDto dto, int? authenticatedUserId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Belirtilen telefon numarasının aktif doğrulama durumunu, kalan süreyi ve deneme hakkını döner.
    /// </summary>
    Task<SmsVerificationStatusDto> GetStatusAsync(string phoneNumber, CancellationToken cancellationToken = default);

    /// <summary>
    /// Belirtilen telefon numarasının daha önce doğrulanıp doğrulanmadığını kontrol eder.
    /// </summary>
    Task<bool> IsPhoneVerifiedAsync(string phoneNumber, CancellationToken cancellationToken = default);
}
