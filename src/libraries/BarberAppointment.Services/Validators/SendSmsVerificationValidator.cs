using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class SendSmsVerificationValidator : AbstractValidator<SendSmsVerificationDto>
{
    public SendSmsVerificationValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .Matches(@"^(\+90|0)?5\d{9}$")
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 05551234567 veya 5551234567).");
    }
}

