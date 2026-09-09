using System.Text.Json;
using BarberAppointment.Data.Context;
using BarberAppointment.WebApi.HealthChecks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BarberAppointment.UnitTests.HealthChecks;

public class HealthCheckTests
{
    private readonly Mock<ILogger<MssqlDatabaseHealthCheck>> _loggerMock;

    public HealthCheckTests()
    {
        _loggerMock = new Mock<ILogger<MssqlDatabaseHealthCheck>>();
    }

    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static AppDbContext CreateInvalidSqlServerDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=invalid_unreachable_server_12345;Database=NonExistentDb;Connect Timeout=1;")
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task MssqlDatabaseHealthCheck_WhenDatabaseIsAccessible_ReturnsHealthy()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var sut = new MssqlDatabaseHealthCheck(dbContext, _loggerMock.Object);
        var context = new HealthCheckContext();

        // Act
        var result = await sut.CheckHealthAsync(context);

        // Assert
        result.Status.Should().Be(HealthStatus.Healthy);
        result.Description.Should().Contain("MSSQL veritabanı bağlantısı başarılı");
        result.Data.Should().ContainKey("provider");
    }

    [Fact]
    public async Task MssqlDatabaseHealthCheck_WhenDatabaseIsUnreachable_ReturnsUnhealthyWithClearMessage()
    {
        // Arrange
        using var dbContext = CreateInvalidSqlServerDbContext();
        var sut = new MssqlDatabaseHealthCheck(dbContext, _loggerMock.Object);
        var context = new HealthCheckContext();

        // Act
        var result = await sut.CheckHealthAsync(context);

        // Assert
        result.Status.Should().Be(HealthStatus.Unhealthy);
        result.Description.Should().NotBeNullOrWhiteSpace();
        result.Description.Should().Contain("MSSQL veritabanı");
    }

    [Fact]
    public async Task HealthCheckResponseWriter_WhenHealthy_Writes200AndStructuredJson()
    {
        // Arrange
        var entries = new Dictionary<string, HealthReportEntry>
        {
            ["api"] = new(
                HealthStatus.Healthy,
                "BarberAppointment REST API çalışıyor.",
                TimeSpan.FromMilliseconds(5),
                null,
                null),
            ["database"] = new(
                HealthStatus.Healthy,
                "MSSQL veritabanı bağlantısı sağlıklı.",
                TimeSpan.FromMilliseconds(15),
                null,
                new Dictionary<string, object> { ["provider"] = "SqlServer", ["database"] = "BarberAppointmentDb" })
        };

        var report = new HealthReport(entries, TimeSpan.FromMilliseconds(20));

        var httpContext = new DefaultHttpContext();
        var responseStream = new MemoryStream();
        httpContext.Response.Body = responseStream;

        // Act
        await HealthCheckResponseWriter.WriteResponse(httpContext, report);

        // Assert
        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        httpContext.Response.ContentType.Should().Contain("application/json");

        responseStream.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(responseStream);
        var json = await reader.ReadToEndAsync();

        var parsed = JsonSerializer.Deserialize<HealthResponseDto>(json, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        parsed.Should().NotBeNull();
        parsed!.Status.Should().Be("Healthy");
        parsed.Entries.Should().ContainKey("api");
        parsed.Entries["api"].Status.Should().Be("Healthy");
        parsed.Entries.Should().ContainKey("database");
        parsed.Entries["database"].Status.Should().Be("Healthy");
        parsed.Entries["database"].Data.Should().ContainKey("database");
    }

    [Fact]
    public async Task HealthCheckResponseWriter_WhenDatabaseUnhealthy_Writes503AndReportsErrorClearly()
    {
        // Arrange
        var dbException = new InvalidOperationException("Sunucu bağlantısı zaman aşımına uğradı (SQL Network Interfaces, error: 26).");
        var entries = new Dictionary<string, HealthReportEntry>
        {
            ["api"] = new(
                HealthStatus.Healthy,
                "BarberAppointment REST API çalışıyor.",
                TimeSpan.FromMilliseconds(3),
                null,
                null),
            ["database"] = new(
                HealthStatus.Unhealthy,
                "MSSQL veritabanına erişilemiyor: " + dbException.Message,
                TimeSpan.FromMilliseconds(1005),
                dbException,
                null)
        };

        var report = new HealthReport(entries, TimeSpan.FromMilliseconds(1008));

        var httpContext = new DefaultHttpContext();
        var responseStream = new MemoryStream();
        httpContext.Response.Body = responseStream;

        // Act
        await HealthCheckResponseWriter.WriteResponse(httpContext, report);

        // Assert: HTTP 503 Service Unavailable
        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status503ServiceUnavailable);

        responseStream.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(responseStream);
        var json = await reader.ReadToEndAsync();

        var parsed = JsonSerializer.Deserialize<HealthResponseDto>(json, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        parsed.Should().NotBeNull();
        parsed!.Status.Should().Be("Unhealthy");
        parsed.Entries.Should().ContainKey("database");
        parsed.Entries["database"].Status.Should().Be("Unhealthy");
        parsed.Entries["database"].Error.Should().Contain("SQL Network Interfaces");
        parsed.Entries["database"].Description.Should().Contain("MSSQL veritabanına erişilemiyor");
    }
}

