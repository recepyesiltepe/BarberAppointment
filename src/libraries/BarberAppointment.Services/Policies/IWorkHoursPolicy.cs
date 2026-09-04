namespace BarberAppointment.Services.Policies;

public interface IWorkHoursPolicy
{
    TimeSpan WorkDayStart { get; }
    TimeSpan WorkDayEnd { get; }
    bool IsWithinWorkHours(DateTime startAt, DateTime endAt);
}

public class DefaultWorkHoursPolicy : IWorkHoursPolicy
{
    public TimeSpan WorkDayStart { get; } = new(9, 0, 0);
    public TimeSpan WorkDayEnd { get; } = new(20, 0, 0);

    public bool IsWithinWorkHours(DateTime startAt, DateTime endAt)
    {
        if (startAt.TimeOfDay < WorkDayStart)
            return false;

        if (endAt.TimeOfDay > WorkDayEnd)
            return false;

        if (startAt >= endAt)
            return false;

        return true;
    }
}
