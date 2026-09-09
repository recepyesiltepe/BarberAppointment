using BarberAppointment.Services.Common;
using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class SendSmsVerificationValidator : AbstractValidator<SendSmsVerificationDto>
{
    public SendSmsVerificationValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .Must(TurkishPhoneNumberHelper.IsValid)
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");
    }
}

