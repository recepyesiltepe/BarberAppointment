using BarberAppointment.Services.Common;
using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class VerifySmsCodeValidator : AbstractValidator<VerifySmsCodeDto>
{
    public VerifySmsCodeValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .Must(TurkishPhoneNumberHelper.IsValid)
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Doğrulama kodu boş bırakılamaz.")
            .Matches(@"^\d{6}$")
            .WithMessage("Doğrulama kodu 6 haneli bir sayı olmalıdır.");
    }
}

