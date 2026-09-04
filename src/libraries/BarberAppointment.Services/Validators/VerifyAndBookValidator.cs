using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class VerifyAndBookValidator : AbstractValidator<VerifyAndBookDto>
{
    public VerifyAndBookValidator()
    {
        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .Matches(@"^(\+90|0)?5\d{9}$")
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Doğrulama kodu boş bırakılamaz.")
            .Matches(@"^\d{6}$")
            .WithMessage("Doğrulama kodu 6 haneli bir sayı olmalıdır.");

        RuleFor(x => x.Appointment)
            .NotNull().WithMessage("Randevu bilgileri gereklidir.");

        When(x => x.Appointment != null, () =>
        {
            RuleFor(x => x.Appointment.EmployeeId)
                .GreaterThan(0).WithMessage("Geçerli bir personel seçilmelidir.");

            RuleFor(x => x.Appointment.ServiceId)
                .GreaterThan(0).WithMessage("Geçerli bir hizmet seçilmelidir.");

            RuleFor(x => x.Appointment.StartAt)
                .NotEmpty().WithMessage("Randevu başlangıç saati gereklidir.");
        });
    }
}

