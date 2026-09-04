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
