namespace BarberAppointment.Services.DTOs;

public class VerifyEmailDto
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationEmailDto
{
    public string Email { get; set; } = string.Empty;
}

public class EmailVerificationResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? SimulationToken { get; set; }
}
