using BarberAppointment.Domain.Entities;

namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default);
}
