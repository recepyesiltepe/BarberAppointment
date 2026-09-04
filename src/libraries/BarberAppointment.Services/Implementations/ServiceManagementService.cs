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
        ValidateServiceInputs(dto.Name, dto.DurationMinutes, dto.Price);

        var service = new Service
        {
            Name = dto.Name.Trim(),
            DurationMinutes = dto.DurationMinutes,
            Price = dto.Price,
            IsActive = true
        };

        await _unitOfWork.Services.AddAsync(service, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(service);
    }

    public async Task<ServiceDto> UpdateAsync(int id, UpdateServiceDto dto, CancellationToken cancellationToken = default)
    {
        var service = await _unitOfWork.Services.GetByIdAsync(id, cancellationToken);
        if (service == null)
            throw new NotFoundException($"ID: {id} olan hizmet bulunamadı.");

        ValidateServiceInputs(dto.Name, dto.DurationMinutes, dto.Price);

        service.Name = dto.Name.Trim();
        service.DurationMinutes = dto.DurationMinutes;
        service.Price = dto.Price;
        service.IsActive = dto.IsActive;

        _unitOfWork.Services.Update(service);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(service);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var service = await _unitOfWork.Services.GetByIdAsync(id, cancellationToken);
        if (service == null)
            throw new NotFoundException($"ID: {id} olan hizmet bulunamadı.");

        var hasAppointments = await _unitOfWork.Services.HasAppointmentsAsync(id, cancellationToken);

        if (hasAppointments)
        {
            // Randevu geçmişi bulunduğu için ilişkisel bütünlüğü korumak adına pasife al
            service.IsActive = false;
            _unitOfWork.Services.Update(service);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return false;
        }

        // Randevu kaydı olmayan hizmetleri (örn. test hizmetleri) ve EmployeeServices ilişkilerini kalıcı olarak sil
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
        IsActive = s.IsActive
    };
}
