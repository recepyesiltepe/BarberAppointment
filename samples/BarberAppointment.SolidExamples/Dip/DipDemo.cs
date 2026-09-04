namespace BarberAppointment.SolidExamples.Dip;

public static class DipDemo
{
    public static void Run()
    {
        IAppointmentRepository repository = new InMemoryAppointmentRepository();
        IAppointmentService service = new AppointmentService(repository);
        var controller = new AppointmentsController(service);

        Console.WriteLine(controller.Post("Cemil", "Saç + sakal"));
        Console.WriteLine(controller.Post("Deniz", "Fön"));
        Console.WriteLine($"Toplam kayıt (servis üzerinden): {service.Count()}");
    }
}

public sealed record NewAppointmentRequest(string Customer, string Service);

public interface IAppointmentRepository
{
    void Save(NewAppointmentRequest request);
    int Count();
}

public sealed class InMemoryAppointmentRepository : IAppointmentRepository
{
    private readonly List<NewAppointmentRequest> _store = [];

    public void Save(NewAppointmentRequest request) => _store.Add(request);

    public int Count() => _store.Count;
}

public interface IAppointmentService
{
    string Create(NewAppointmentRequest request);
    int Count();
}

public sealed class AppointmentService : IAppointmentService
{
    private readonly IAppointmentRepository _repository;

    public AppointmentService(IAppointmentRepository repository)
    {
        _repository = repository;
    }

    public string Create(NewAppointmentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Customer))
        {
            return "400 müşteri adı gerekli";
        }

        _repository.Save(request);
        return "201 oluşturuldu";
    }

    public int Count() => _repository.Count();
}

public sealed class AppointmentsController
{
    private readonly IAppointmentService _service;

    public AppointmentsController(IAppointmentService service)
    {
        _service = service;
    }

    public string Post(string customer, string serviceName)
    {
        return _service.Create(new NewAppointmentRequest(customer, serviceName));
    }
}
