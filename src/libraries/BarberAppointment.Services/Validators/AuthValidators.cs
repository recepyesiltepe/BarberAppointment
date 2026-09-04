using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class RegisterValidator : AbstractValidator<RegisterDto>
{
    public RegisterValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad Soyad zorunludur.")
            .Length(2, 100).WithMessage("Ad Soyad 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        When(x => !string.IsNullOrEmpty(x.Phone), () =>
        {
            RuleFor(x => x.Phone!)
                .Matches(@"^[0-9\+\-\s\(\)]{7,20}$")
                .WithMessage("Geçerli bir telefon numarası formatı giriniz.");
        });

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");

        RuleFor(x => x.ConfirmPassword)
            .NotEmpty().WithMessage("Şifre tekrarı zorunludur.")
            .Equal(x => x.Password).WithMessage("Şifreler birbiriyle eşleşmiyor.");

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Geçerli bir kullanıcı rolü seçilmelidir.");
    }
}

public class LoginValidator : AbstractValidator<LoginDto>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.");
    }
}

public class ChangePasswordValidator : AbstractValidator<ChangePasswordDto>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Mevcut şifre zorunludur.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Yeni şifre zorunludur.")
            .MinimumLength(6).WithMessage("Yeni şifre en az 6 karakter olmalıdır.")
            .NotEqual(x => x.CurrentPassword).WithMessage("Yeni şifre mevcut şifrenizden farklı olmalıdır.");

        RuleFor(x => x.ConfirmNewPassword)
            .NotEmpty().WithMessage("Yeni şifre tekrarı zorunludur.")
            .Equal(x => x.NewPassword).WithMessage("Yeni şifreler birbiriyle eşleşmiyor.");
    }
}
