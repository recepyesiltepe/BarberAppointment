namespace BarberAppointment.Core.Time;

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateTime Today { get; }
}

public class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
    public DateTime Today => DateTime.UtcNow.Date;
}
