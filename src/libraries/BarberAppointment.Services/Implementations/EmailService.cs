using System.Net;
using System.Net.Mail;
using System.Text;
using BarberAppointment.Services.Configurations;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BarberAppointment.Services.Implementations;

/// <summary>
/// E-posta gönderim servisi uygulaması (Ek Geliştirme 1).
/// SMTP yapılandırması üzerinden e-posta gönderir veya geliştirme ortamında simüle eder.
/// </summary>
public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IOptions<EmailSettings> options,
        ILogger<EmailService> logger)
    {
        _settings = options.Value ?? new EmailSettings();
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(
        string toEmail,
        string subject,
        string body,
        bool isHtml = true,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("[EmailService] Alıcı e-posta adresi boş olduğu için gönderim yapılmadı.");
            return false;
        }

        // Simülasyon Modu (Gerçek SMTP sunucusu devre dışı bırakılmışsa)
        if (!_settings.EnableEmailSending || string.IsNullOrWhiteSpace(_settings.Host))
        {
            var preview = isHtml ? "[HTML İçerik]" : (body.Length > 200 ? body[..200] + "..." : body);
            _logger.LogInformation(
                "[EmailService - SİMÜLASYON MODU] E-posta gönderimi simüle edildi | Alıcı: {To} | Konu: {Subject} | Gönderen: {SenderName} <{SenderEmail}> | Önizleme: {Preview}",
                toEmail,
                subject,
                _settings.SenderName,
                _settings.SenderEmail,
                preview);

            return true;
        }

        // Gerçek SMTP Gönderim Modu
        try
        {
            using var client = new SmtpClient(_settings.Host.Trim(), _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                UseDefaultCredentials = false,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 15000
            };

            if (!string.IsNullOrWhiteSpace(_settings.UserName) && !string.IsNullOrWhiteSpace(_settings.Password))
            {
                var cleanPassword = _settings.Password.Replace(" ", "").Trim();
                client.Credentials = new NetworkCredential(_settings.UserName.Trim(), cleanPassword);
            }

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(_settings.SenderEmail, _settings.SenderName, Encoding.UTF8),
                Subject = subject,
                SubjectEncoding = Encoding.UTF8,
                Body = body,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = isHtml
            };

            mailMessage.To.Add(new MailAddress(toEmail));

            await client.SendMailAsync(mailMessage, cancellationToken);

            _logger.LogInformation("[EmailService] E-posta başarıyla iletildi: {To}, Konu: {Subject}", toEmail, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] E-posta gönderimi sırasında hata oluştu. Alıcı: {To}, Konu: {Subject}", toEmail, subject);
            return false;
        }
    }

    public async Task<bool> SendAppointmentConfirmationAsync(
        AppointmentDto appointment,
        string toEmail,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Randevunuz Onaylandı — Kuaför Randevu Sistemi (#{appointment.Id})";
        var body = GenerateAppointmentConfirmationHtml(appointment);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    public async Task<bool> SendAppointmentCancellationAsync(
        AppointmentDto appointment,
        string toEmail,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Randevunuz İptal Edildi — Kuaför Randevu Sistemi (#{appointment.Id})";
        var body = GenerateAppointmentCancellationHtml(appointment);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    public async Task<bool> SendAppointmentRescheduledAsync(
        AppointmentDto appointment,
        string toEmail,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Randevu Saatiniz Güncellendi — Kuaför Randevu Sistemi (#{appointment.Id})";
        var body = GenerateAppointmentRescheduledHtml(appointment);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    public async Task<bool> SendPasswordChangedNotificationAsync(
        string toEmail,
        string userName,
        DateTime changedAt,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var subject = "Güvenlik Uyarısı: Şifreniz Değiştirildi — Kuaför Randevu Sistemi";
        var body = GeneratePasswordChangedNotificationHtml(userName, toEmail, changedAt, ipAddress);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    public async Task<bool> SendWelcomeAndEmailVerificationAsync(
        string toEmail,
        string fullName,
        string token,
        CancellationToken cancellationToken = default)
    {
        var subject = "Hoş Geldiniz — E-Posta Adresinizi Doğrulayın";
        var body = GenerateWelcomeAndEmailVerificationHtml(fullName, toEmail, token);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    public async Task<bool> SendPasswordResetEmailAsync(
        string toEmail,
        string fullName,
        string token,
        CancellationToken cancellationToken = default)
    {
        var subject = "Şifre Sıfırlama Talebi — Kuaför Randevu Sistemi";
        var body = GeneratePasswordResetHtml(fullName, toEmail, token);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    public async Task<bool> SendPasswordChangeVerificationAsync(
        string toEmail,
        string fullName,
        string token,
        CancellationToken cancellationToken = default)
    {
        var subject = "Şifre Değişikliği Doğrulama Kodu — Kuaför Randevu Sistemi";
        var body = GeneratePasswordChangeVerificationHtml(fullName, toEmail, token);

        return await SendEmailAsync(toEmail, subject, body, isHtml: true, cancellationToken);
    }

    // ─── HTML E-Posta Şablon Üreteçleri ────────────────────────────────────────

    private static string GetEmailHeader(string accentColor, string title, string subtitle)
    {
        return $"""
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid {accentColor};">
                <h1 style="margin: 0; font-size: 22px; color: {accentColor}; letter-spacing: 0.5px; font-weight: 700;">✂️ {title}</h1>
                <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">{subtitle}</p>
            </div>
        """;
    }

    private static string GetEmailBaseContainer()
    {
        return """
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        """;
    }

    private static string GetEmailFooter()
    {
        var year = DateTime.UtcNow.Year;
        return $"""
            <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                Bu e-posta Kuaför Randevu Sistemi tarafından otomatik olarak gönderilmiştir.<br>
                &copy; {year} Kuaför Randevu Sistemi. Tüm hakları saklıdır.
            </div>
        """;
    }

    private static string GenerateAppointmentConfirmationHtml(AppointmentDto app)
    {
        var sb = new StringBuilder();
        sb.Append("""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b;">
            <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        """);

        sb.Append(GetEmailHeader("#f59e0b", "KUAFÖR RANDEVU SİSTEMİ", "Modern & Hızlı Randevu Yönetimi"));

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #ecfdf5; color: #059669; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        ✓ Randevu Onaylandı
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {WebUtility.HtmlEncode(app.CustomerName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        Kuaför randevunuz başarıyla oluşturuldu ve randevu takvimine işlendi. Randevu detaylarınız aşağıda yer almaktadır:
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Randevu No:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">#{app.Id}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Hizmet:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(app.ServiceName)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Uzman Kuaför:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(app.EmployeeName)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Tarih:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{app.StartAt:dd.MM.yyyy dddd}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Saat Aralığı:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{app.StartAt:HH:mm} – {app.EndAt:HH:mm} ({app.DurationMinutes} dk)</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Hizmet Tutarı:</td>
                                <td style="padding: 8px 0; color: #d97706; font-weight: 700; font-size: 16px; text-align: right;">{app.Price:N2} ₺</td>
                            </tr>
        """);

        if (!string.IsNullOrWhiteSpace(app.Notes))
        {
            sb.Append($"""
                            <tr style="border-top: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Notunuz:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 500; text-align: right;">{WebUtility.HtmlEncode(app.Notes)}</td>
                            </tr>
            """);
        }

        sb.Append("""
                        </table>
                    </div>

                    <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                        * Randevu saatinizden en az 5 dakika önce salonda bulunmanızı rica ederiz.<br>
                        * Randevunuzu web yönetim paneli veya mobil uygulamamız üzerinden dilediğiniz zaman inceleyebilir veya güncelleyebilirsiniz.
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }

    private static string GenerateAppointmentCancellationHtml(AppointmentDto app)
    {
        var sb = new StringBuilder();
        sb.Append("""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b;">
            <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        """);

        sb.Append(GetEmailHeader("#ef4444", "KUAFÖR RANDEVU SİSTEMİ", "Randevu İptal Bildirimi"));

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #fef2f2; color: #dc2626; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        ✕ Randevu İptal Edildi
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {WebUtility.HtmlEncode(app.CustomerName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        #{app.Id} numaralı kuaför randevunuz talebiniz doğrultusunda iptal edilmiştir. İlgili saat aralığı diğer müşterilerimizin kullanımı için serbest bırakılmıştır.
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Randevu No:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">#{app.Id}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Hizmet:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(app.ServiceName)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Uzman Kuaför:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(app.EmployeeName)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">İptal Edilen Tarih:</td>
                                <td style="padding: 8px 0; color: #ef4444; font-weight: 600; text-align: right;">{app.StartAt:dd.MM.yyyy HH:mm}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                        Dilediğiniz zaman web panelimiz veya mobil uygulamamız üzerinden yeni bir randevu oluşturabilirsiniz.
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }

    private static string GenerateAppointmentRescheduledHtml(AppointmentDto app)
    {
        var sb = new StringBuilder();
        sb.Append("""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b;">
            <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        """);

        sb.Append(GetEmailHeader("#3b82f6", "KUAFÖR RANDEVU SİSTEMİ", "Randevu Saati Güncelleme"));

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        🕒 Randevu Saati Güncellendi
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {WebUtility.HtmlEncode(app.CustomerName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        #{app.Id} numaralı kuaför randevunuzun tarihi/saati başarıyla güncellenmiştir. Güncellenen randevu detaylarınız:
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Randevu No:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">#{app.Id}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Hizmet:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(app.ServiceName)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Uzman Kuaför:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(app.EmployeeName)}</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Yeni Tarih:</td>
                                <td style="padding: 8px 0; color: #2563eb; font-weight: 700; text-align: right;">{app.StartAt:dd.MM.yyyy dddd}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Yeni Saat Aralığı:</td>
                                <td style="padding: 8px 0; color: #2563eb; font-weight: 700; text-align: right;">{app.StartAt:HH:mm} – {app.EndAt:HH:mm}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                        Randevunuzla ilgili tüm detayları sistemimizden takip edebilirsiniz.
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }

    private static string GeneratePasswordChangedNotificationHtml(string userName, string email, DateTime changedAt, string? ipAddress)
    {
        var sb = new StringBuilder();
        sb.Append("""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b;">
            <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        """);

        sb.Append(GetEmailHeader("#ef4444", "GÜVENLİK BİLDİRİMİ", "Hesap Şifresi Değişikliği"));

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #fef2f2; color: #dc2626; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        🔒 Şifre Başarıyla Güncellendi
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {WebUtility.HtmlEncode(userName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        Kuaför Randevu Sistemi hesabınızın giriş şifresi başarıyla değiştirilmiştir. Hesabınızın güvenliği amacıyla bu bilgilendirme iletilmektedir.
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">İşlem:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">Hesap Şifresi Değişikliği</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Tarih ve Saat:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{changedAt:dd.MM.yyyy HH:mm:ss} (UTC)</td>
                            </tr>
                            <tr style="border-bottom: 1px dashed #e2e8f0;">
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">İlgili Hesap:</td>
                                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{WebUtility.HtmlEncode(email)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">İşlem Durumu:</td>
                                <td style="padding: 8px 0; color: #16a34a; font-weight: 700; text-align: right;">✓ Başarılı</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; color: #b45309; font-size: 13px; margin-bottom: 4px;">
                            ⚠️ Bu işlemi siz yapmadıysanız:
                        </div>
                        <div style="font-size: 13px; color: #92400e; line-height: 1.5;">
                            Eğer şifrenizi siz değiştirmediyseniz lütfen vakit kaybetmeden sistem yöneticinizle irtibata geçiniz ve hesabınızı güvence altına alınız.
                        </div>
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }

    private static string GenerateWelcomeAndEmailVerificationHtml(string fullName, string email, string token)
    {
        var sb = new StringBuilder();
        sb.Append(GetEmailBaseContainer());
        sb.Append(GetEmailHeader("#10b981", "HOŞ GELDİNİZ", "E-Posta Doğrulama & Hesap Aktivasyonu"));

        var verifyUrl = $"http://localhost:3000/verify-email?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #ecfdf5; color: #059669; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        🎉 Hesabınız Başarıyla Oluşturuldu
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {WebUtility.HtmlEncode(fullName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        Kuaför Randevu Sistemi'ne hoş geldiniz! Randevularınızı kolayca oluşturmak ve tüm bildirimleri güvenle alabilmek için e-posta adresinizi doğrulayabilirsiniz.
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                            Tek Kullanımlık Doğrulama Kodunuz
                        </div>
                        <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: 4px; font-family: monospace; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; display: inline-block; margin-bottom: 14px;">
                            {token}
                        </div>
                        <div>
                            <a href="{verifyUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
                                E-Posta Adresini Doğrula →
                            </a>
                        </div>
                    </div>

                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                        <div style="font-size: 13px; color: #166534; line-height: 1.5;">
                            ⏱️ Bu doğrulama kodu ve bağlantısı <strong>24 saat</strong> boyunca geçerlidir.
                        </div>
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }

    private static string GeneratePasswordResetHtml(string fullName, string email, string token)
    {
        var sb = new StringBuilder();
        sb.Append(GetEmailBaseContainer());
        sb.Append(GetEmailHeader("#f59e0b", "ŞİFRE SIFIRLAMA", "Güvenli Hesap Kurtarma"));

        var resetUrl = $"http://localhost:3000/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #fffbeb; color: #d97706; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        🔑 Şifre Sıfırlama Talebi
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {WebUtility.HtmlEncode(fullName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        Kuaför Randevu Sistemi hesabınız için bir şifre sıfırlama talebinde bulunuldu. Yeni şifrenizi belirlemek için aşağıdaki kodu veya bağlantıyı kullanabilirsiniz:
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                            Tek Kullanımlık Sıfırlama Kodunuz
                        </div>
                        <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: 4px; font-family: monospace; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; display: inline-block; margin-bottom: 14px;">
                            {token}
                        </div>
                        <div>
                            <a href="{resetUrl}" style="display: inline-block; background-color: #f59e0b; color: #000000; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
                                Yeni Şifre Belirle →
                            </a>
                        </div>
                    </div>

                    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; color: #b45309; font-size: 13px; margin-bottom: 4px;">
                            ⚠️ Önemli Güvenlik Uyarısı:
                        </div>
                        <div style="font-size: 13px; color: #92400e; line-height: 1.5;">
                            Bu kod ve sıfırlama bağlantısı <strong>30 dakika</strong> boyunca geçerlidir. Eğer şifre sıfırlama talebinde siz bulunmadıysanız bu e-postayı dikkate almayınız; hesabınız güvendedir.
                        </div>
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }

    private static string GeneratePasswordChangeVerificationHtml(string fullName, string email, string token)
    {
        var sb = new StringBuilder();
        sb.Append(GetEmailBaseContainer());
        sb.Append(GetEmailHeader("#8b5cf6", "ŞİFRE DEĞİŞİKLİĞİ DOĞRULAMA", "Kimlik Doğrulama Kodu"));

        sb.Append($"""
                <div style="padding: 28px 24px;">
                    <div style="display: inline-block; background-color: #f5f3ff; color: #7c3aed; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 18px;">
                        🔐 Şifre Değişikliği Talebi
                    </div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #0f172a;">
                        Sayın {System.Net.WebUtility.HtmlEncode(fullName)},
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        <strong>{System.Net.WebUtility.HtmlEncode(email)}</strong> hesabınız için bir şifre değişikliği talebi alındı. İşlemi onaylamak için aşağıdaki 6 haneli doğrulama kodunu kullanınız:
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                            Tek Kullanımlık Doğrulama Kodunuz
                        </div>
                        <div style="font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 6px; font-family: monospace; background: #ffffff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 14px 20px; display: inline-block;">
                            {token}
                        </div>
                    </div>

                    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                        <div style="font-weight: 700; color: #b45309; font-size: 13px; margin-bottom: 4px;">
                            ⏱️ Bu kod <strong>15 dakika</strong> boyunca geçerlidir.
                        </div>
                        <div style="font-size: 13px; color: #92400e; line-height: 1.5;">
                            Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız. Hesabınız güvendedir, şifreniz değiştirilmemiştir.
                        </div>
                    </div>
                </div>
        """);

        sb.Append(GetEmailFooter());
        sb.Append("""
            </div>
        </body>
        </html>
        """);

        return sb.ToString();
    }
}
