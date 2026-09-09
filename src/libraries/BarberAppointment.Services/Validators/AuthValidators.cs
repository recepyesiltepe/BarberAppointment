using BarberAppointment.Services.Common;
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

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Telefon numarası zorunludur.")
            .Must(TurkishPhoneNumberHelper.IsValid)
            .WithMessage("Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67 veya 555 123 45 67).");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre zorunludur.")
            .Must(PasswordPolicyHelper.IsValid)
            .WithMessage(PasswordPolicyHelper.ValidationMessage);

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
            .Must(PasswordPolicyHelper.IsValid)
            .WithMessage(PasswordPolicyHelper.ValidationMessage)
            .NotEqual(x => x.CurrentPassword).WithMessage("Yeni şifre mevcut şifrenizden farklı olmalıdır.");

        RuleFor(x => x.ConfirmNewPassword)
            .NotEmpty().WithMessage("Yeni şifre tekrarı zorunludur.")
            .Equal(x => x.NewPassword).WithMessage("Yeni şifreler birbiriyle eşleşmiyor.");
    }
}

public class ForgotPasswordValidator : AbstractValidator<ForgotPasswordDto>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");
    }
}

public class ResetPasswordValidator : AbstractValidator<ResetPasswordDto>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Şifre sıfırlama kodu/token'ı zorunludur.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Yeni şifre zorunludur.")
            .Must(PasswordPolicyHelper.IsValid)
            .WithMessage(PasswordPolicyHelper.ValidationMessage);

        RuleFor(x => x.ConfirmNewPassword)
            .NotEmpty().WithMessage("Yeni şifre tekrarı zorunludur.")
            .Equal(x => x.NewPassword).WithMessage("Yeni şifreler birbiriyle eşleşmiyor.");
    }
}

public class VerifyEmailValidator : AbstractValidator<VerifyEmailDto>
{
    public VerifyEmailValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Doğrulama token'ı zorunludur.");
    }
}

public class ResendVerificationEmailValidator : AbstractValidator<ResendVerificationEmailDto>
{
    public ResendVerificationEmailValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");
    }
}
