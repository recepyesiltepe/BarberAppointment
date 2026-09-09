using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BarberAppointment.WebApi.HealthChecks;

public static class HealthCheckResponseWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static async Task WriteResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.StatusCode = report.Status switch
        {
            HealthStatus.Healthy => StatusCodes.Status200OK,
            HealthStatus.Degraded => StatusCodes.Status200OK,
            _ => StatusCodes.Status503ServiceUnavailable
        };

        var response = new HealthResponseDto
        {
            Status = report.Status.ToString(),
            TotalDuration = report.TotalDuration.ToString("c"),
            CheckedAt = DateTime.UtcNow,
            Entries = report.Entries.ToDictionary(
                entry => entry.Key,
                entry => new HealthEntryDto
                {
                    Status = entry.Value.Status.ToString(),
                    Description = entry.Value.Description,
                    Duration = entry.Value.Duration.ToString("c"),
                    Data = entry.Value.Data.Count > 0
                        ? entry.Value.Data.ToDictionary(k => k.Key, v => v.Value?.ToString())
                        : null,
                    Error = entry.Value.Exception?.Message
                })
        };

        var json = JsonSerializer.Serialize(response, JsonOptions);
        await context.Response.WriteAsync(json);
    }
}

public class HealthResponseDto
{
    public string Status { get; set; } = string.Empty;
    public string TotalDuration { get; set; } = string.Empty;
    public DateTime CheckedAt { get; set; }
    public Dictionary<string, HealthEntryDto> Entries { get; set; } = new();
}

public class HealthEntryDto
{
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Duration { get; set; } = string.Empty;
    public Dictionary<string, string?>? Data { get; set; }
    public string? Error { get; set; }
}

