namespace BarberAppointment.SolidExamples.Lsp;

public static class LspDemo
{
    public static void Run()
    {
        IReadableCalendar readOnly = new StaffDayCalendar();
        Console.WriteLine($"Okuma (salt okunur sözleşme): {readOnly.List().Count} kayıt");

        IWritableCalendar writable = new StaffDayCalendar();
        AddSampleSlot(writable);
        Console.WriteLine($"Yazılabilir takvim: {writable.List().Count} kayıt");
    }

    private static void AddSampleSlot(IWritableCalendar calendar)
    {
        calendar.Add(new CalendarSlot("Mehmet", DateTime.Today.AddHours(14)));
    }
}

public sealed record CalendarSlot(string StaffName, DateTime Start);

public interface IReadableCalendar
{
    IReadOnlyList<CalendarSlot> List();
}

public interface IWritableCalendar : IReadableCalendar
{
    void Add(CalendarSlot slot);
}

public sealed class StaffDayCalendar : IWritableCalendar
{
    private readonly List<CalendarSlot> _slots = [];

    public void Add(CalendarSlot slot) => _slots.Add(slot);

    public IReadOnlyList<CalendarSlot> List() => _slots;
}
