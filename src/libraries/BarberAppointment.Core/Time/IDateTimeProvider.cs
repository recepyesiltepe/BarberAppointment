namespace BarberAppointment.Core.Time;

public static class TurkeyTimeHelper
{
    public static readonly TimeZoneInfo TimeZone = ResolveTurkeyTimeZone();

    private static TimeZoneInfo ResolveTurkeyTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
            }
            catch
            {
                return TimeZoneInfo.CreateCustomTimeZone("Turkey Standard Time", TimeSpan.FromHours(3), "Turkey Standard Time", "Turkey Standard Time");
            }
        }
    }

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZone);

    public static DateTime Today => Now.Date;

    public static DateTime ToTurkeyTime(DateTime dt)
    {
        if (dt.Kind == DateTimeKind.Utc)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(dt, TimeZone);
        }
        return dt;
    }

    public static bool IsInPast(DateTime dateTime)
    {
        var localTime = ToTurkeyTime(dateTime);
        return localTime <= Now;
    }
}

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateTime Today { get; }
    DateTime TurkeyNow { get; }
    DateTime TurkeyToday { get; }
    DateTime ToTurkeyTime(DateTime dateTime);
    bool IsInPast(DateTime dateTime);
}

public class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
    public DateTime Today => TurkeyTimeHelper.Today;
    public DateTime TurkeyNow => TurkeyTimeHelper.Now;
    public DateTime TurkeyToday => TurkeyTimeHelper.Today;
    public DateTime ToTurkeyTime(DateTime dateTime) => TurkeyTimeHelper.ToTurkeyTime(dateTime);
    public bool IsInPast(DateTime dateTime) => TurkeyTimeHelper.IsInPast(dateTime);
}
