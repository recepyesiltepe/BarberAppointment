namespace BarberAppointment.Services.Configurations;

/// <summary>
/// E-posta ve SMTP sunucu yapılandırma ayarları modeli.
/// </summary>
public class EmailSettings
{
    public const string SectionName = "EmailSettings";

    /// <summary>
    /// SMTP sunucu adresi (örn: smtp.mailtrap.io, smtp.gmail.com).
    /// </summary>
    public string Host { get; set; } = "localhost";

    /// <summary>
    /// SMTP port numarası (varsayılan: 587).
    /// </summary>
    public int Port { get; set; } = 587;

    /// <summary>
    /// SSL / TLS şifreleme kullanımı.
    /// </summary>
    public bool EnableSsl { get; set; } = true;

    /// <summary>
    /// SMTP kimlik doğrulama kullanıcı adı.
    /// </summary>
    public string? UserName { get; set; }

    /// <summary>
    /// SMTP kimlik doğrulama parolası / uygulama şifresi.
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// Gönderici e-posta adresi.
    /// </summary>
    public string SenderEmail { get; set; } = "noreply@barberappointment.com";

    /// <summary>
    /// Gönderici görünen adı.
    /// </summary>
    public string SenderName { get; set; } = "Kuaför Randevu Sistemi";

    /// <summary>
    /// E-posta gönderiminin aktif olup olmadığı.
    /// False olduğunda e-postalar gerçek sunucu yerine konsol/loglara simüle edilir (Geliştirme ve test ortamı için güvenli).
    /// </summary>
    public bool EnableEmailSending { get; set; } = false;
}

