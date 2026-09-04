using System.Security.Cryptography;
using System.Text;

namespace BarberAppointment.Services.Security;

public interface IPasswordHasher
{
    void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt);
    bool VerifyPasswordHash(string password, byte[] passwordHash, byte[] passwordSalt);
}

public class PasswordHasher : IPasswordHasher
{
    public void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        using var hmac = new HMACSHA512();
        passwordSalt = hmac.Key;
        passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
    }

    public bool VerifyPasswordHash(string password, byte[] passwordHash, byte[] passwordSalt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        if (passwordHash == null || passwordHash.Length != 64)
            return false;

        if (passwordSalt == null || passwordSalt.Length != 128)
            return false;

        using var hmac = new HMACSHA512(passwordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));

        return CryptographicOperations.FixedTimeEquals(computedHash, passwordHash);
    }
}
