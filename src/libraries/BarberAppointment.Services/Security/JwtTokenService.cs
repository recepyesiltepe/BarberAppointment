using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BarberAppointment.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberAppointment.Services.Security;

public interface IJwtTokenService
{
    string GenerateToken(User user, int? employeeId = null);
    int GetExpirationSeconds();
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user, int? employeeId = null)
    {
        var secretKey = _configuration["Jwt:Key"]
            ?? "BarberAppointment_Default_Super_Secret_Key_For_JWT_Authentication_2026_Secure_Must_Be_Long_Enough!";
        var issuer = _configuration["Jwt:Issuer"] ?? "BarberAppointment";
        var audience = _configuration["Jwt:Audience"] ?? "BarberAppointmentClient";
        var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationInMinutes"], out var exp) ? exp : 60;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrEmpty(user.Phone))
        {
            claims.Add(new Claim(ClaimTypes.MobilePhone, user.Phone));
        }

        if (employeeId.HasValue)
        {
            claims.Add(new Claim("employee_id", employeeId.Value.ToString()));
        }

        var expires = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }

    public int GetExpirationSeconds()
    {
        var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationInMinutes"], out var exp) ? exp : 60;
        return expirationMinutes * 60;
    }
}
