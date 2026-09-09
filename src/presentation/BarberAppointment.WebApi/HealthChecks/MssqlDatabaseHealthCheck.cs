using BarberAppointment.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BarberAppointment.WebApi.HealthChecks;

public class MssqlDatabaseHealthCheck : IHealthCheck
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<MssqlDatabaseHealthCheck> _logger;

    public MssqlDatabaseHealthCheck(AppDbContext dbContext, ILogger<MssqlDatabaseHealthCheck> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);

            if (canConnect)
            {
                var data = new Dictionary<string, object>
                {
                    ["provider"] = _dbContext.Database.ProviderName ?? "Microsoft.EntityFrameworkCore.SqlServer"
                };

                if (_dbContext.Database.IsRelational())
                {
                    data["database"] = _dbContext.Database.GetDbConnection().Database;
                }

                return HealthCheckResult.Healthy("MSSQL veritabanı bağlantısı başarılı ve erişilebilir durumda.", data);
            }

            _logger.LogWarning("MSSQL veritabanı bağlantı testi olumsuz sonuçlandı (CanConnect: false).");
            return HealthCheckResult.Unhealthy("MSSQL veritabanına bağlanılamadı. Sunucu veya veritabanı erişilemez durumda.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MSSQL veritabanı sağlık kontrolü sırasında hata oluştu: {Message}", ex.Message);
            return HealthCheckResult.Unhealthy($"MSSQL veritabanına erişilemiyor: {ex.Message}", ex);
        }
    }
}
