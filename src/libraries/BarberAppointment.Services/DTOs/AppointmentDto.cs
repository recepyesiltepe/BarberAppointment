using BarberAppointment.Core.Enums;

namespace BarberAppointment.Services.DTOs;

public class AppointmentDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public AppointmentStatus Status { get; set; }
    public string StatusLabel => Status switch
    {
        AppointmentStatus.Pending => "Beklemede",
        AppointmentStatus.Confirmed => "Onaylandı",
        AppointmentStatus.Completed => "Tamamlandı",
        AppointmentStatus.Cancelled => "İptal Edildi",
        _ => "Bilinmiyor"
    };
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAppointmentDto
{
    public int UserId { get; set; }
    public int EmployeeId { get; set; }
    public int ServiceId { get; set; }
    public DateTime StartAt { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Randevu güncelleme (yeniden zamanlama) için DTO.
/// Yalnızca StartAt ve Notes değiştirilebilir;
/// personel ve hizmet değişikliği gerektiğinde eski randevu iptal edilip yenisi oluşturulur.
/// </summary>
public class UpdateAppointmentDto
{
    public DateTime StartAt { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Belirli bir personel için uygun randevu slotlarını sorgulayan filtre DTO.
/// </summary>
public class AvailableSlotsQueryDto
{
    public int EmployeeId { get; set; }
    public int ServiceId { get; set; }
    public DateTime Date { get; set; }
}

/// <summary>
/// Tek bir boş zaman dilimini temsil eder.
/// </summary>
public class AvailableSlotDto
{
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public int DurationMinutes { get; set; }
}

/// <summary>
/// Randevu listeleme filtresi.
/// </summary>
public class AppointmentFilterDto
{
    public int? EmployeeId { get; set; }
    public int? UserId { get; set; }
    public AppointmentStatus? Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
