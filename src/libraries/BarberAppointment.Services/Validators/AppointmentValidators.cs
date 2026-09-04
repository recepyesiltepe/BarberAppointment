using BarberAppointment.Services.DTOs;
using FluentValidation;

namespace BarberAppointment.Services.Validators;

public class CreateAppointmentValidator : AbstractValidator<CreateAppointmentDto>
{
    public CreateAppointmentValidator()
    {
        RuleFor(x => x.UserId)
            .GreaterThanOrEqualTo(0).WithMessage("Geçerli bir müşteri (UserId) seçilmelidir.");

        RuleFor(x => x.EmployeeId)
            .GreaterThan(0).WithMessage("Geçerli bir personel (EmployeeId) seçilmelidir.");

        RuleFor(x => x.ServiceId)
            .GreaterThan(0).WithMessage("Geçerli bir hizmet (ServiceId) seçilmelidir.");

        RuleFor(x => x.StartAt)
            .NotEmpty().WithMessage("Randevu başlangıç tarihi ve saati belirtilmelidir.")
            .Must(startAt => startAt >= DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Geçmiş bir zamana randevu oluşturulamaz.");

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Not alanı en fazla 500 karakter olabilir.");
    }
}

public class UpdateAppointmentValidator : AbstractValidator<UpdateAppointmentDto>
{
    public UpdateAppointmentValidator()
    {
        RuleFor(x => x.StartAt)
            .NotEmpty().WithMessage("Randevu başlangıç tarihi ve saati belirtilmelidir.")
            .Must(startAt => startAt >= DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Geçmiş bir zamana randevu taşınamaz.");

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Not alanı en fazla 500 karakter olabilir.");
    }
}

public class AvailableSlotsQueryValidator : AbstractValidator<AvailableSlotsQueryDto>
{
    public AvailableSlotsQueryValidator()
    {
        RuleFor(x => x.EmployeeId)
            .GreaterThan(0).WithMessage("Geçerli bir personel ID belirtilmelidir.");

        RuleFor(x => x.ServiceId)
            .GreaterThan(0).WithMessage("Geçerli bir hizmet ID belirtilmelidir.");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Slot sorgulama tarihi belirtilmelidir.");
    }
}
