using System.Text.RegularExpressions;

namespace BarberAppointment.Services.Common;

public static class PasswordPolicyHelper
{
    public const int MinLength = 8;
    public const string ValidationMessage = "Şifre en az 8 karakter uzunluğunda olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter (!@#$%^&* vb.) içermelidir.";

    public static bool IsValid(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;

        if (password.Length < MinLength)
            return false;

        // At least 1 uppercase letter
        if (!password.Any(char.IsUpper))
            return false;

        // At least 1 lowercase letter
        if (!password.Any(char.IsLower))
            return false;

        // At least 1 digit
        if (!password.Any(char.IsDigit))
            return false;

        // At least 1 special character (anything other than alphanumeric)
        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
            return false;

        return true;
    }
}

