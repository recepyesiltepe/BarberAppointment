using System.Net;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace BarberAppointment.Services.Implementations;

public class AppointmentReminderProcessor : IAppointmentReminderProcessor
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<AppointmentReminderProcessor> _logger;

    public AppointmentReminderProcessor(
        IUnitOfWork unitOfWork,
        IEmailService emailService,
        ISmsService smsService,
        IDateTimeProvider dateTimeProvider,
        ILogger<AppointmentReminderProcessor> logger)
    {
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _smsService = smsService;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<int> ProcessPendingRemindersAsync(CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var windowEnd = now.AddHours(24);

        _logger.LogInformation("[AppointmentReminder] Yaklaşan randevu kontrolü başlatıldı. Zaman aralığı: {Start:yyyy-MM-dd HH:mm} - {End:yyyy-MM-dd HH:mm}", now, windowEnd);

        var pendingAppointments = await _unitOfWork.Appointments.GetPendingRemindersAsync(now, windowEnd, cancellationToken);

        if (!pendingAppointments.Any())
        {
            _logger.LogInformation("[AppointmentReminder] Hatırlatma gönderilecek bekleyen randevu bulunamadı.");
            return 0;
        }

        int processedCount = 0;

        foreach (var appointment in pendingAppointments)
        {
            if (appointment.IsReminderSent)
                continue;

            try
            {
                var dto = MapToDto(appointment);

                // 1. E-posta ile hatırlatma gönderimi
                if (!string.IsNullOrWhiteSpace(appointment.User?.Email))
                {
                    await _emailService.SendAppointmentReminderAsync(dto, appointment.User.Email, cancellationToken);
                }

                // 2. SMS ile hatırlatma gönderimi
                if (!string.IsNullOrWhiteSpace(appointment.User?.Phone))
                {
                    var smsMessage = $"Sayın {appointment.User.FullName}, {appointment.StartAt:dd.MM.yyyy HH:mm} tarihindeki {appointment.Service?.Name} randevunuzu hatırlatırız. Randevu No: #{appointment.Id} — Kuaför Randevu Sistemi";
                    await _smsService.SendSmsAsync(appointment.User.Phone, smsMessage, cancellationToken);
                }

                // 3. Randevuyu tekrar gönderilmeyecek şekilde işaretle
                appointment.IsReminderSent = true;
                appointment.ReminderSentAt = _dateTimeProvider.UtcNow;

                _unitOfWork.Appointments.Update(appointment);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                processedCount++;
                _logger.LogInformation(
                    "[AppointmentReminder] Randevu #{AppointmentId} için {CustomerName} ({Email}) müşterisine hatırlatma başarıyla iletildi.",
                    appointment.Id,
                    appointment.User?.FullName ?? "Bilinmiyor",
                    appointment.User?.Email ?? "-");
            }
            catch (Exception ex)
            {
                // Tek bir randevu gönderimindeki hata tüm döngüyü bozmamalı
                _logger.LogError(ex, "[AppointmentReminder] Randevu #{AppointmentId} için hatırlatma gönderilemedi.", appointment.Id);
            }
        }

        _logger.LogInformation("[AppointmentReminder] Hatırlatma taraması tamamlandı. Toplam iletilen: {Count}", processedCount);
        return processedCount;
    }

    private static AppointmentDto MapToDto(Appointment a) => new()
    {
        Id = a.Id,
        UserId = a.UserId,
        CustomerName = a.User?.FullName ?? string.Empty,
        CustomerPhone = a.User?.Phone ?? string.Empty,
        EmployeeId = a.EmployeeId,
        EmployeeName = a.Employee?.FullName ?? string.Empty,
        ServiceId = a.ServiceId,
        ServiceName = a.Service?.Name ?? string.Empty,
        Price = a.Service?.Price ?? 0,
        DurationMinutes = a.Service?.DurationMinutes ?? 0,
        StartAt = a.StartAt,
        EndAt = a.EndAt,
        Status = a.Status,
        Notes = a.Notes,
        CreatedAt = a.CreatedAt
    };
}

