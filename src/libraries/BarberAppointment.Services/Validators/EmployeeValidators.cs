using BarberAppointment.Services.Common;
using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class CreateEmployeeValidator : AbstractValidator<CreateEmployeeDto>
{
    public CreateEmployeeValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Personel adı soyadı zorunludur.")
            .Length(2, 100).WithMessage("Personel adı soyadı 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.Title)
            .MaximumLength(100).WithMessage("Ünvan en fazla 100 karakter olabilir.");

        When(x => !string.IsNullOrWhiteSpace(x.Email), () =>
        {
            RuleFor(x => x.Email!)
                .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Personel için e-posta belirtildiğinde şifre girilmesi zorunludur.")
                .Must(PasswordPolicyHelper.IsValid)
                .WithMessage(PasswordPolicyHelper.ValidationMessage);
        });

        When(x => !string.IsNullOrWhiteSpace(x.Phone), () =>
        {
            RuleFor(x => x.Phone!)
                .Must(TurkishPhoneNumberHelper.IsValid)
                .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");
        });

        RuleFor(x => x.ServiceIds)
            .NotNull().WithMessage("Hizmet listesi boş olamaz.")
            .Must(ids => ids != null && ids.All(id => id > 0))
            .WithMessage("Hizmet ID'leri geçerli pozitif sayılar olmalıdır.");
    }
}

public class UpdateEmployeeValidator : AbstractValidator<UpdateEmployeeDto>
{
    public UpdateEmployeeValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Personel adı soyadı zorunludur.")
            .Length(2, 100).WithMessage("Personel adı soyadı 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.Title)
            .MaximumLength(100).WithMessage("Ünvan en fazla 100 karakter olabilir.");

        When(x => !string.IsNullOrWhiteSpace(x.Email), () =>
        {
            RuleFor(x => x.Email!)
                .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");
        });

        When(x => !string.IsNullOrWhiteSpace(x.Password), () =>
        {
            RuleFor(x => x.Password!)
                .Must(PasswordPolicyHelper.IsValid)
                .WithMessage(PasswordPolicyHelper.ValidationMessage);
        });

        When(x => !string.IsNullOrWhiteSpace(x.Phone), () =>
        {
            RuleFor(x => x.Phone!)
                .Must(TurkishPhoneNumberHelper.IsValid)
                .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");
        });

        When(x => x.ServiceIds != null, () =>
        {
            RuleFor(x => x.ServiceIds!)
                .Must(ids => ids.All(id => id > 0))
                .WithMessage("Hizmet ID'leri geçerli pozitif sayılar olmalıdır.");
        });
    }
}

public class AssignServicesValidator : AbstractValidator<AssignServicesDto>
{
    public AssignServicesValidator()
    {
        RuleFor(x => x.ServiceIds)
            .NotNull().WithMessage("Hizmet listesi boş olamaz.")
            .NotEmpty().WithMessage("En az bir hizmet ID'si belirtilmelidir.")
            .Must(ids => ids.All(id => id > 0))
            .WithMessage("Hizmet ID'leri pozitif sayılar olmalıdır.");
    }
}
