namespace BarberAppointment.Domain.Entities;

/// <summary>
/// Kompozit bir hizmetin (paket) içerdiği alt hizmetleri tanımlayan ilişkisel varlıktır.
/// Örneğin: "Saç & Sakal Paketi" -> "Saç Kesimi", "Sakal Tıraşı"
/// </summary>
public class CompositeServiceItem : BaseEntity
{
    /// <summary>
    /// Kompozit (ana) hizmet ID'si
    /// </summary>
    public int CompositeServiceId { get; set; }
    public virtual Service CompositeService { get; set; } = null!;

    /// <summary>
    /// Pakete dahil olan alt hizmet ID'si
    /// </summary>
    public int SubServiceId { get; set; }
    public virtual Service SubService { get; set; } = null!;

    /// <summary>
    /// Alt hizmetin paket içindeki sırası
    /// </summary>
    public int Order { get; set; } = 0;
}

