namespace BarberAppointment.SolidExamples.Srp;

public static class SrpDemo
{
    public static void Run()
    {
        var booking = new AppointmentBookingService();
        var notifier = new ConsoleAppointmentNotifier();
        var price = new AppointmentPriceCalculator();

        var appointment = booking.Book(staffName: "Ali", serviceName: "Saç kesimi", durationMinutes: 30);
        var total = price.Calculate(basePrice: 250m, durationMinutes: 30);
        notifier.NotifyCreated(appointment, total);
    }
}

public sealed class Appointment
{
    public required string StaffName { get; init; }
    public required string ServiceName { get; init; }
    public required DateTime Start { get; init; }
    public required DateTime End { get; init; }
}

public sealed class AppointmentBookingService
{
    public Appointment Book(string staffName, string serviceName, int durationMinutes)
    {
        var start = DateTime.Today.AddHours(11);
        return new Appointment
        {
            StaffName = staffName,
            ServiceName = serviceName,
            Start = start,
            End = start.AddMinutes(durationMinutes)
        };
    }
}

public sealed class AppointmentPriceCalculator
{
    public decimal Calculate(decimal basePrice, int durationMinutes)
    {
        if (durationMinutes > 45)
        {
            return basePrice * 1.1m;
        }

        return basePrice;
    }
}

public interface IAppointmentNotifier
{
    void NotifyCreated(Appointment appointment, decimal total);
}

public sealed class ConsoleAppointmentNotifier : IAppointmentNotifier
{
    public void NotifyCreated(Appointment appointment, decimal total)
    {
        Console.WriteLine(
            $"{appointment.StaffName} / {appointment.ServiceName} " +
            $"{appointment.Start:HH:mm}-{appointment.End:HH:mm} tutar={total} TL");
    }
}
