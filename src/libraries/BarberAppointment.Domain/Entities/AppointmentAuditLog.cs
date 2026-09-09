namespace BarberAppointment.Domain.Entities;

public class AppointmentAuditLog : BaseEntity
{
    public int AppointmentId { get; set; }
    public virtual Appointment? Appointment { get; set; }

    /// <summary>Gerçekleştirilen işlem: Created, Rescheduled, Cancelled, Completed</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Değişiklik öncesi durum (ilk oluşturmada null veya Pending)</summary>
    public string? OldStatus { get; set; }

    /// <summary>Değişiklik sonrası yeni durum</summary>
    public string NewStatus { get; set; } = string.Empty;

    /// <summary>İşlemi yapan kullanıcı ID'si (Sistem ise null)</summary>
    public int? ChangedByUserId { get; set; }
    public virtual User? ChangedByUser { get; set; }

    /// <summary>İşlemi yapan rol: Admin, Employee, Customer, System</summary>
    public string? ChangedByRole { get; set; }

    /// <summary>İşlemi yapan kişinin adı (kullanıcı silinse dahi denetim kaydında korunur)</summary>
    public string? ChangedByName { get; set; }

    /// <summary>Değişikliğin yapıldığı tarih ve saat (UTC)</summary>
    public DateTime ChangedDate { get; set; } = DateTime.UtcNow;

    /// <summary>İşleme dair açıklayıcı not veya detay</summary>
    public string? Details { get; set; }
}

