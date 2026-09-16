using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;

namespace BarberAppointment.Services.Implementations;

public class ServiceManagementService : IServiceManagementService
{
    private readonly IUnitOfWork _unitOfWork;

    public ServiceManagementService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ServiceDto>> GetAllAsync(bool activeOnly = false, CancellationToken cancellationToken = default)
    {
        var services = activeOnly
            ? await _unitOfWork.Services.GetActiveServicesAsync(cancellationToken)
            : await _unitOfWork.Services.GetAllAsync(cancellationToken);

        return services.Select(MapToDto).ToList();
    }

    public async Task<ServiceDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var service = await _unitOfWork.Services.GetByIdAsync(id, cancellationToken);
        if (service == null)
            throw new NotFoundException($"ID: {id} olan hizmet bulunamadı.");

        return MapToDto(service);
    }

    public async Task<ServiceDto> CreateAsync(CreateServiceDto dto, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Service>? subServices = null;

        if (dto.IsComposite)
        {
            if (dto.SubServiceIds == null || dto.SubServiceIds.Distinct().Count() < 2)
            {
                throw new BusinessException("Kompozit bir paket hizmeti oluşturabilmek için en az 2 farklı alt hizmet seçilmelidir.");
            }

            subServices = await _unitOfWork.Services.GetByIdsAsync(dto.SubServiceIds.Distinct(), cancellationToken);
            if (subServices.Count != dto.SubServiceIds.Distinct().Count())
            {
                throw new BusinessException("Seçilen alt hizmetlerden bazıları sistemde bulunamadı.");
            }

            if (subServices.Any(s => s.IsComposite))
            {
                throw new BusinessException("Bir kompozit hizmet, başka bir kompozit hizmeti alt hizmet olarak içeremez.");
            }

            // Süre veya fiyat belirtilmemişse veya 0 ise alt hizmetlerin toplamından otomatik hesapla
            if (dto.DurationMinutes <= 0)
            {
                dto.DurationMinutes = subServices.Sum(s => s.DurationMinutes);
            }

            if (dto.Price <= 0)
            {
                dto.Price = subServices.Sum(s => s.Price);
            }
        }

        ValidateServiceInputs(dto.Name, dto.DurationMinutes, dto.Price);

        var service = new Service
        {
            Name = dto.Name.Trim(),
            DurationMinutes = dto.DurationMinutes,
            Price = dto.Price,
            IsActive = true,
            IsComposite = dto.IsComposite
        };

        await _unitOfWork.Services.AddAsync(service, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (dto.IsComposite && dto.SubServiceIds != null)
        {
            int order = 1;
            foreach (var subId in dto.SubServiceIds.Distinct())
            {
                service.SubServiceItems.Add(new CompositeServiceItem
                {
                    CompositeServiceId = service.Id,
                    SubServiceId = subId,
                    Order = order++,
                    IsActive = true
                });
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Alt hizmet detaylarını da içeren güncel veriyi çek
            var reloaded = await _unitOfWork.Services.GetByIdAsync(service.Id, cancellationToken);
            return MapToDto(reloaded ?? service);
        }

        return MapToDto(service);
    }

    public async Task<ServiceDto> UpdateAsync(int id, UpdateServiceDto dto, CancellationToken cancellationToken = default)
    {
        var service = await _unitOfWork.Services.GetByIdAsync(id, cancellationToken);
        if (service == null)
            throw new NotFoundException($"ID: {id} olan hizmet bulunamadı.");

        IReadOnlyList<Service>? subServices = null;

        if (dto.IsComposite)
        {
            if (dto.SubServiceIds == null || dto.SubServiceIds.Distinct().Count() < 2)
            {
                throw new BusinessException("Kompozit bir paket hizmeti için en az 2 farklı alt hizmet seçilmelidir.");
            }

            if (dto.SubServiceIds.Contains(id))
            {
                throw new BusinessException("Bir hizmet kendisini alt hizmet olarak içeremez.");
            }

            subServices = await _unitOfWork.Services.GetByIdsAsync(dto.SubServiceIds.Distinct(), cancellationToken);
            if (subServices.Count != dto.SubServiceIds.Distinct().Count())
            {
                throw new BusinessException("Seçilen alt hizmetlerden bazıları sistemde bulunamadı.");
            }

            if (subServices.Any(s => s.IsComposite && s.Id != id))
            {
                throw new BusinessException("Bir kompozit hizmet, başka bir kompozit hizmeti alt hizmet olarak içeremez.");
            }

            // Süre veya fiyat 0 veya daha küçükse alt hizmetlerin toplamından otomatik hesapla
            if (dto.DurationMinutes <= 0)
            {
                dto.DurationMinutes = subServices.Sum(s => s.DurationMinutes);
            }

            if (dto.Price <= 0)
            {
                dto.Price = subServices.Sum(s => s.Price);
            }
        }

        ValidateServiceInputs(dto.Name, dto.DurationMinutes, dto.Price);

        service.Name = dto.Name.Trim();
        service.DurationMinutes = dto.DurationMinutes;
        service.Price = dto.Price;
        service.IsActive = dto.IsActive;
        service.IsComposite = dto.IsComposite;

        // Kompozit alt hizmet ilişkilerini güncelle
        service.SubServiceItems.Clear();

        if (dto.IsComposite && dto.SubServiceIds != null)
        {
            int order = 1;
            foreach (var subId in dto.SubServiceIds.Distinct())
            {
                service.SubServiceItems.Add(new CompositeServiceItem
                {
                    CompositeServiceId = service.Id,
                    SubServiceId = subId,
                    Order = order++,
                    IsActive = true
                });
            }
        }

        _unitOfWork.Services.Update(service);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var reloaded = await _unitOfWork.Services.GetByIdAsync(service.Id, cancellationToken);
        return MapToDto(reloaded ?? service);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var service = await _unitOfWork.Services.GetByIdAsync(id, cancellationToken);
        if (service == null)
            throw new NotFoundException($"ID: {id} olan hizmet bulunamadı.");

        var isPartOfComposite = await _unitOfWork.Services.IsPartOfCompositeServiceAsync(id, cancellationToken);
        if (isPartOfComposite)
        {
            throw new BusinessException("Bu hizmet aktif bir paket (kompozit) hizmetin içeriğinde yer aldığı için silinemez. Önce ilgili paketten çıkarılmalıdır.");
        }

        var hasAppointments = await _unitOfWork.Services.HasAppointmentsAsync(id, cancellationToken);

        if (hasAppointments)
        {
            // Randevu geçmişi bulunduğu için ilişkisel bütünlüğü korumak adına pasife al
            service.IsActive = false;
            _unitOfWork.Services.Update(service);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return false;
        }

        // Randevu kaydı olmayan hizmetleri ve bağlantılarını kalıcı olarak sil
        await _unitOfWork.Services.DeleteServiceWithRelationsAsync(id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ValidateServiceInputs(string name, int duration, decimal price)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessException("Hizmet adı boş olamaz.");

        if (duration <= 0)
            throw new BusinessException("Hizmet süresi 0'dan büyük olmalıdır.");

        if (price < 0)
            throw new BusinessException("Hizmet fiyatı 0 veya daha büyük olmalıdır.");
    }

    private static ServiceDto MapToDto(Service s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        DurationMinutes = s.DurationMinutes,
        Price = s.Price,
        IsActive = s.IsActive,
        IsComposite = s.IsComposite,
        SubServices = s.SubServiceItems?
            .Where(csi => csi.SubService != null)
            .OrderBy(csi => csi.Order)
            .Select(csi => new SubServiceItemDto
            {
                Id = csi.SubService.Id,
                Name = csi.SubService.Name,
                DurationMinutes = csi.SubService.DurationMinutes,
                Price = csi.SubService.Price,
                Order = csi.Order
            }).ToList() ?? new List<SubServiceItemDto>()
    };
}
