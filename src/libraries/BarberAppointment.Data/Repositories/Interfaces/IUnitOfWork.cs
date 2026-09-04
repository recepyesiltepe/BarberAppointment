namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable, IAsyncDisposable
{
    IAppointmentRepository Appointments { get; }
    IEmployeeRepository Employees { get; }
    IServiceRepository Services { get; }
    IUserRepository Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
