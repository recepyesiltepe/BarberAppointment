namespace BarberAppointment.Services.DTOs;

public class ServiceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; }

    /// <summary>
    /// Bu hizmetin kompozit (alt hizmetler paketi) olup olmadığı
    /// </summary>
    public bool IsComposite { get; set; }

    /// <summary>
    /// Eğer kompozit bir hizmetse, içerdiği alt hizmetlerin listesi
    /// </summary>
    public List<SubServiceItemDto> SubServices { get; set; } = new();
}

public class SubServiceItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public int Order { get; set; }
}

public class CreateServiceDto
{
    public string Name { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }

    /// <summary>
    /// Kompozit (paket) hizmet mi?
    /// </summary>
    public bool IsComposite { get; set; } = false;

    /// <summary>
    /// Eğer kompozit hizmet ise, dahil edilecek alt hizmet ID'leri (en az 2 adet)
    /// </summary>
    public List<int>? SubServiceIds { get; set; }
}

public class UpdateServiceDto
{
    public string Name { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Kompozit (paket) hizmet mi?
    /// </summary>
    public bool IsComposite { get; set; } = false;

    /// <summary>
    /// Eğer kompozit hizmet ise, dahil edilecek alt hizmet ID'leri
    /// </summary>
    public List<int>? SubServiceIds { get; set; }
}
