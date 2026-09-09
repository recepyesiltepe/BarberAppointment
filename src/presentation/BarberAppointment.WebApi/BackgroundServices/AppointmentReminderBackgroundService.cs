using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

namespace BarberAppointment.WebApi.BackgroundServices;

/// <summary>
/// Yaklaşan randevuları periyodik olarak kontrol eden ve hatırlatma bildirimlerini (E-posta &amp; SMS)
/// scoped dependency kullanarak arka planda gönderen Hosted Service.
/// </summary>
public class AppointmentReminderBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AppointmentReminderBackgroundService> _logger;
    private readonly TimeSpan _checkInterval;

    public AppointmentReminderBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<AppointmentReminderBackgroundService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        var intervalMinutes = int.TryParse(configuration["Reminder:CheckIntervalMinutes"], out var mins) && mins > 0
            ? mins
            : 2; // Varsayılan 2 dakikada bir kontrol
        _checkInterval = TimeSpan.FromMinutes(intervalMinutes);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "[AppointmentReminderBackgroundService] Randevu Hatırlatma Arka Plan Servisi aktif edildi. Periyot: {IntervalMinutes} dakika.",
            _checkInterval.TotalMinutes);

        using var timer = new PeriodicTimer(_checkInterval);

        // İlk başlangıçta 10 saniye bekle (Uygulama tamamen ayağa kalksın)
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            await RunReminderCycleAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AppointmentReminderBackgroundService] İlk hatırlatma taramasında hata oluştu.");
        }

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunReminderCycleAsync(stoppingToken);
        }

        _logger.LogInformation("[AppointmentReminderBackgroundService] Randevu Hatırlatma Arka Plan Servisi sonlandırıldı.");
    }

    private async Task RunReminderCycleAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var processor = scope.ServiceProvider.GetRequiredService<IAppointmentReminderProcessor>();

            await processor.ProcessPendingRemindersAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            // İptal durumunda sessizce çık
        }
        catch (Exception ex)
        {
            // BackgroundService hata aldığında ana API'nin çalışmasını bozmamalı
            _logger.LogError(ex, "[AppointmentReminderBackgroundService] Hatırlatma döngüsünde hata yakalandı. API çalışmaya devam ediyor.");
        }
    }
}
