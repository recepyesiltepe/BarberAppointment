using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Repositories.Implementations;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(u => u.IsActive)
            .ToListAsync(cancellationToken);
    }
}
