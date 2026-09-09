using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class SendSmsVerificationValidator : AbstractValidator<SendSmsVerificationDto>
{
    public SendSmsVerificationValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .Must(BeValidTurkishPhoneNumber)
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 05551234567 veya 5551234567).");
    }

    private static bool BeValidTurkishPhoneNumber(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return false;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("90") && digits.Length == 12)
            digits = digits[2..];
        if (digits.StartsWith("0") && digits.Length == 11)
            digits = digits[1..];
        return digits.Length == 10 && digits.StartsWith("5");
    }
}

