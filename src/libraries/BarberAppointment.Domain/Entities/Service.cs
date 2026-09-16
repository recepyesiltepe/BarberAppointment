namespace BarberAppointment.Domain.Entities;

public class Service : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }

    /// <summary>
    /// Bu hizmetin birden fazla alt hizmetten oluşan bir paket (kompozit) olup olmadığını belirtir.
    /// </summary>
    public bool IsComposite { get; set; } = false;

    // Navigation properties
    public virtual ICollection<EmployeeService> EmployeeServices { get; set; } = new List<EmployeeService>();
    public virtual ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

    /// <summary>
    /// Bu kompozit hizmetin içerdiği alt hizmet kayıtları (Eğer IsComposite == true ise)
    /// </summary>
    public virtual ICollection<CompositeServiceItem> SubServiceItems { get; set; } = new List<CompositeServiceItem>();

    /// <summary>
    /// Bu hizmetin dahil olduğu üst kompozit paketler
    /// </summary>
    public virtual ICollection<CompositeServiceItem> ParentCompositeItems { get; set; } = new List<CompositeServiceItem>();
}
