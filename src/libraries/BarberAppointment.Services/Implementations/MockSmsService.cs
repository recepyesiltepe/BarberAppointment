using System.Collections.Concurrent;
using BarberAppointment.Services.Configurations;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BarberAppointment.Services.Implementations;

/// <summary>
/// SMS gönderim altyapısının Mock / Simülasyon servisi (Ek Geliştirme 3).
/// Harici bir SMS Gateway (NetGsm, Twilio vb.) gerekmeden konsol ve loglara yapılandırılmış çıktılar üretir.
/// Test ve geliştirme ortamında son gönderilen SMS kayıtlarını hafızada saklar.
/// </summary>
public class MockSmsService : ISmsService
{
    private readonly ILogger<MockSmsService> _logger;
    private readonly SmsSettings _settings;

    // Test ve denetim amacıyla son gönderilen SMS kayıtlarını hafızada tutar
    private static readonly ConcurrentQueue<SentSmsRecord> _sentHistory = new();

    public MockSmsService(ILogger<MockSmsService> logger, IOptions<SmsSettings> options)
    {
        _logger = logger;
        _settings = options.Value ?? new SmsSettings();
    }

    /// <summary>
    /// Belirtilen telefon numarasına metin SMS'i gönderir / simüle eder.
    /// </summary>
    public Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        var record = new SentSmsRecord(
            PhoneNumber: phoneNumber,
            Message: message,
            SentAtUtc: DateTime.UtcNow,
            Provider: _settings.Provider,
            IsSimulated: !_settings.EnableSmsSending
        );

        _sentHistory.Enqueue(record);

        // Maksimum 100 geçmiş kaydı sakla
        while (_sentHistory.Count > 100 && _sentHistory.TryDequeue(out _)) { }

        _logger.LogInformation(
            "[MockSmsService - {Mode}] SMS İletisi | Alıcı: {Phone} | Başlık: {Title} | Mesaj: {Message}",
            _settings.EnableSmsSending ? "GERÇEK MOD" : "SİMÜLASYON MODU",
            MaskPhoneNumber(phoneNumber),
            _settings.SenderTitle,
            message
        );

        return Task.FromResult(true);
    }

    /// <summary>
    /// Şablonlu OTP doğrulama SMS'i gönderir / simüle eder.
    /// </summary>
    public Task<bool> SendVerificationCodeAsync(string phoneNumber, string code, int expirationMinutes = 3, CancellationToken cancellationToken = default)
    {
        var message = $"Sayın Müşterimiz, Kuaför Randevu doğrulama kodunuz: {code}. Bu kod {expirationMinutes} dakika süreyle geçerlidir. Kodunuzu kimseyle paylaşmayınız. - {_settings.SenderTitle}";
        return SendSmsAsync(phoneNumber, message, cancellationToken);
    }

    /// <summary>
    /// Testler için son gönderilen SMS kayıtlarını döner.
    /// </summary>
    public static IReadOnlyList<SentSmsRecord> GetSentHistory() => _sentHistory.ToArray();

    /// <summary>
    /// Testler için son gönderilen SMS kaydını döner.
    /// </summary>
    public static SentSmsRecord? GetLastSentRecord()
    {
        var array = _sentHistory.ToArray();
        return array.Length > 0 ? array[^1] : null;
    }

    private static string MaskPhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length < 7)
            return phone;

        var start = phone[..4];
        var end = phone[^3..];
        return $"{start}***{end}";
    }
}

/// <summary>
/// Gönderilen SMS kaydı modeli.
/// </summary>
public record SentSmsRecord(
    string PhoneNumber,
    string Message,
    DateTime SentAtUtc,
    string Provider,
    bool IsSimulated
);

