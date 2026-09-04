using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore.Storage;

namespace BarberAppointment.Data.Repositories.Implementations;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    private IAppointmentRepository? _appointments;
    private IEmployeeRepository? _employees;
    private IServiceRepository? _services;
    private IUserRepository? _users;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IAppointmentRepository Appointments => _appointments ??= new AppointmentRepository(_context);
    public IEmployeeRepository Employees => _employees ??= new EmployeeRepository(_context);
    public IServiceRepository Services => _services ??= new ServiceRepository(_context);
    public IUserRepository Users => _users ??= new UserRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        _transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_transaction != null)
        {
            await _transaction.DisposeAsync();
        }
        await _context.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
