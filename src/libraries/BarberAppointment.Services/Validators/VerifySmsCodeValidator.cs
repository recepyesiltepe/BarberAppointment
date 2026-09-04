using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class VerifySmsCodeValidator : AbstractValidator<VerifySmsCodeDto>
{
    public VerifySmsCodeValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .Matches(@"^(\+90|0)?5\d{9}$")
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Doğrulama kodu boş bırakılamaz.")
            .Matches(@"^\d{6}$")
            .WithMessage("Doğrulama kodu 6 haneli bir sayı olmalıdır.");
    }
}

