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

    public async Task<User?> GetByPhoneAsync(string phone, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return null;

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("90") && digits.Length >= 12) digits = digits[2..];
        if (digits.StartsWith("0") && digits.Length >= 11) digits = digits[1..];
        if (digits.Length > 10) digits = digits[^10..];

        var candidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            phone.Trim(),
            digits,
            "0" + digits,
            "90" + digits,
            "+90" + digits,
            "+90 " + digits
        };

        if (digits.Length == 10)
        {
            var area = digits[..3];
            var p1 = digits[3..6];
            var p2 = digits[6..8];
            var p3 = digits[8..10];

            candidates.Add($"0{area} {p1} {p2} {p3}");
            candidates.Add($"0{area} {p1} {p2}{p3}");
            candidates.Add($"{area} {p1} {p2} {p3}");
            candidates.Add($"{area} {p1} {p2}{p3}");
            candidates.Add($"+90 {area} {p1} {p2} {p3}");
            candidates.Add($"+90 {area} {p1} {p2}{p3}");
            candidates.Add($"+90 ({area}) {p1} {p2} {p3}");
            candidates.Add($"+90 ({area}) {p1} {p2}{p3}");
            candidates.Add($"0 ({area}) {p1} {p2} {p3}");
            candidates.Add($"0 ({area}) {p1} {p2}{p3}");
            candidates.Add($"({area}) {p1} {p2} {p3}");
            candidates.Add($"(0{area}) {p1} {p2} {p3}");
            candidates.Add($"0{area}-{p1}-{p2}-{p3}");
            candidates.Add($"0{area}-{p1}-{p2}{p3}");
            candidates.Add($"{area}-{p1}-{p2}-{p3}");
        }

        var candidateList = candidates.ToList();

        var matched = await DbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Phone != null && candidateList.Contains(u.Phone), cancellationToken);

        if (matched != null)
            return matched;

        if (digits.Length >= 7)
        {
            matched = await DbSet
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Phone != null &&
                    u.Phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Replace("+", "").EndsWith(digits),
                    cancellationToken);
        }

        return matched;
    }

    public async Task<User?> GetByRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default)
    {
        return await DbSet
            .AsNoTracking()
            .Where(u => u.IsActive)
            .ToListAsync(cancellationToken);
    }
}
