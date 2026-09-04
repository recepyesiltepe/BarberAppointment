namespace BarberAppointment.SolidExamples.Isp;

public static class IspDemo
{
    public static void Run()
    {
        var store = new InMemoryAppointmentStore();
        IAppointmentWriteRepository writer = store;
        IAppointmentReadRepository reader = store;

        writer.Add("Ayşe — 10:00 sakal");
        Console.WriteLine($"Liste: {string.Join(", ", reader.List())}");

        IAppointmentReport report = new SimpleAppointmentReport();
        Console.WriteLine(report.Summarize(reader.List()));
    }
}

public interface IAppointmentReadRepository
{
    IReadOnlyList<string> List();
}

public interface IAppointmentWriteRepository
{
    void Add(string summary);
}

public interface IAppointmentReport
{
    string Summarize(IReadOnlyList<string> items);
}

public sealed class InMemoryAppointmentStore : IAppointmentReadRepository, IAppointmentWriteRepository
{
    private readonly List<string> _items = [];

    public void Add(string summary) => _items.Add(summary);

    public IReadOnlyList<string> List() => _items;
}

public sealed class SimpleAppointmentReport : IAppointmentReport
{
    public string Summarize(IReadOnlyList<string> items)
    {
        return $"Rapor: {items.Count} randevu";
    }
}
