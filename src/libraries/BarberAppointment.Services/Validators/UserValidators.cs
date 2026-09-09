using BarberAppointment.Services.Common;
using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class CreateUserValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Kullanıcı adı soyadı zorunludur.")
            .Length(2, 100).WithMessage("Ad Soyad 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        When(x => !string.IsNullOrEmpty(x.Phone), () =>
        {
            RuleFor(x => x.Phone!)
                .Must(TurkishPhoneNumberHelper.IsValid)
                .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");
        });

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Geçerli bir kullanıcı rolü seçilmelidir.");
    }
}

public class UpdateUserValidator : AbstractValidator<UpdateUserDto>
{
    public UpdateUserValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Kullanıcı adı soyadı zorunludur.")
            .Length(2, 100).WithMessage("Ad Soyad 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        When(x => !string.IsNullOrEmpty(x.Phone), () =>
        {
            RuleFor(x => x.Phone!)
                .Must(TurkishPhoneNumberHelper.IsValid)
                .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");
        });
    }
}

public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Kullanıcı adı soyadı zorunludur.")
            .Length(2, 100).WithMessage("Ad Soyad 2 ile 100 karakter arasında olmalıdır.");

        When(x => !string.IsNullOrEmpty(x.Phone), () =>
        {
            RuleFor(x => x.Phone!)
                .Must(TurkishPhoneNumberHelper.IsValid)
                .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");
        });
    }
}

