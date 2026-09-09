namespace BarberAppointment.Services.Interfaces;

public interface IAppointmentReminderProcessor
{
    Task<int> ProcessPendingRemindersAsync(CancellationToken cancellationToken = default);
}

