using BarberAppointment.Services.DTOs;

namespace BarberAppointment.Services.Interfaces;

public interface IAppointmentService
{
    /// <summary>Tüm randevuları getirir (filtresiz).</summary>
    Task<IReadOnlyList<AppointmentDto>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Çok kriterli randevu filtreleme.</summary>
    Task<IReadOnlyList<AppointmentDto>> GetFilteredAsync(AppointmentFilterDto filter, CancellationToken cancellationToken = default);

    /// <summary>ID'ye göre randevu detayı.</summary>
    Task<AppointmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Belirli bir personelin belirli gündeki randevuları.</summary>
    Task<IReadOnlyList<AppointmentDto>> GetByEmployeeAsync(int employeeId, DateTime date, CancellationToken cancellationToken = default);

    /// <summary>Müşterinin tüm randevuları.</summary>
    Task<IReadOnlyList<AppointmentDto>> GetByUserAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>Yeni randevu oluşturma (iş kuralları dahil).</summary>
    Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default);

    /// <summary>Randevu yeniden zamanlama (Reschedule). Sadece StartAt ve Notes değiştirilebilir.</summary>
    Task<AppointmentDto> RescheduleAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default);

    /// <summary>Randevu iptali.</summary>
    Task CancelAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Randevuyu tamamlandı olarak işaretleme.</summary>
    Task CompleteAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Belirtilen gün için personelin boş slot listesini döner.</summary>
    Task<IReadOnlyList<AvailableSlotDto>> GetAvailableSlotsAsync(AvailableSlotsQueryDto query, CancellationToken cancellationToken = default);
}
