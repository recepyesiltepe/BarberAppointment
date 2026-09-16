using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class CreateServiceValidator : AbstractValidator<CreateServiceDto>
{
    public CreateServiceValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Hizmet adı zorunludur.")
            .Length(2, 100).WithMessage("Hizmet adı 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(5, 480)
            .WithMessage("Hizmet süresi 5 dakika ile 480 dakika (8 saat) arasında olmalıdır.");

        RuleFor(x => x.Price)
            .GreaterThan(0)
            .WithMessage("Hizmet ücreti sıfırdan büyük olmalıdır.");

        When(x => x.IsComposite, () =>
        {
            RuleFor(x => x.SubServiceIds)
                .NotEmpty().WithMessage("Kompozit bir hizmet için en az 2 alt hizmet seçilmelidir.")
                .Must(ids => ids != null && ids.Distinct().Count() >= 2)
                .WithMessage("Kompozit bir hizmet en az 2 farklı alt hizmet içermelidir.");
        });
    }
}

public class UpdateServiceValidator : AbstractValidator<UpdateServiceDto>
{
    public UpdateServiceValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Hizmet adı zorunludur.")
            .Length(2, 100).WithMessage("Hizmet adı 2 ile 100 karakter arasında olmalıdır.");

        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(5, 480)
            .WithMessage("Hizmet süresi 5 dakika ile 480 dakika (8 saat) arasında olmalıdır.");

        RuleFor(x => x.Price)
            .GreaterThan(0)
            .WithMessage("Hizmet ücreti sıfırdan büyük olmalıdır.");

        When(x => x.IsComposite, () =>
        {
            RuleFor(x => x.SubServiceIds)
                .NotEmpty().WithMessage("Kompozit bir hizmet için en az 2 alt hizmet seçilmelidir.")
                .Must(ids => ids != null && ids.Distinct().Count() >= 2)
                .WithMessage("Kompozit bir hizmet en az 2 farklı alt hizmet içermelidir.");
        });
    }
}
