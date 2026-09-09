namespace BarberAppointment.Services.Common;

/// <summary>
/// Türkiye cep telefonu numaraları için doğrulama, standart normalizasyon ve biçimlendirme kurallarını içerir.
/// Standart format: 5XX XXX XX XX (10 hane, operatör kodu 5 ile başlar).
/// </summary>
public static class TurkishPhoneNumberHelper
{
    /// <summary>
    /// Verilen numaranın geçerli bir Türkiye cep telefonu olup olmadığını doğrular.
    /// Geçerli kabul edilen formatlar: 05XXXXXXXXX, 5XXXXXXXXX, +905XXXXXXXXX, 0 (5XX) XXX XX XX vb.
    /// </summary>
    public static bool IsValid(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return false;

        var digits = ExtractDigits(phone);

        // +90 ile başlıyorsa (12 hane) ilk 2 haneyi (90) at
        if (digits.StartsWith("90") && digits.Length == 12)
            digits = digits[2..];

        // 0 ile başlıyorsa (11 hane) ilk haneyi (0) at
        if (digits.StartsWith("0") && digits.Length == 11)
            digits = digits[1..];

        // Kalan 10 haneli olmalı ve mutlaka '5' ile başlamalıdır (Türkiye mobil operatör kuralı)
        return digits.Length == 10 && digits.StartsWith("5");
    }

    /// <summary>
    /// Numarayı veritabanında saklamak için standart 11 haneli '05XXXXXXXXX' biçimine dönüştürür.
    /// Geçersizse ayıklanan rakamları veya orijinal string'i döner.
    /// </summary>
    public static string Normalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return string.Empty;

        var digits = ExtractDigits(phone);

        if (digits.StartsWith("90") && digits.Length == 12)
            digits = digits[2..];

        if (digits.StartsWith("0") && digits.Length == 11)
            digits = digits[1..];

        return digits.Length == 10 ? "0" + digits : digits;
    }

    /// <summary>
    /// Numarayı '05XX XXX XX XX' formatında kullanıcıya gösterilebilir biçime dönüştürür.
    /// </summary>
    public static string Format(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return string.Empty;

        var normalized = Normalize(phone);
        if (normalized.Length == 11 && normalized.StartsWith("05"))
        {
            // 05XX XXX XX XX
            return $"{normalized[..4]} {normalized.Substring(4, 3)} {normalized.Substring(7, 2)} {normalized.Substring(9, 2)}";
        }

        return phone;
    }

    private static string ExtractDigits(string value)
    {
        return new string(value.Where(char.IsDigit).ToArray());
    }
}

