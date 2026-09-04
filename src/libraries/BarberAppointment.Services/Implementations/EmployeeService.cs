using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using EmployeeServiceEntity = BarberAppointment.Domain.Entities.EmployeeService;

namespace BarberAppointment.Services.Implementations;

public class EmployeeService : IEmployeeService
{
    private readonly IUnitOfWork _unitOfWork;

    public EmployeeService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<EmployeeDto>> GetAllAsync(bool activeOnly = false, CancellationToken cancellationToken = default)
    {
        var employees = await _unitOfWork.Employees.GetEmployeesWithServicesAsync(activeOnly, cancellationToken);
        return employees.Select(MapToDto).ToList();
    }

    public async Task<EmployeeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var employee = await _unitOfWork.Employees.GetByIdWithServicesAsync(id, cancellationToken);
        if (employee == null)
            throw new NotFoundException($"ID: {id} olan personel bulunamadı.");

        return MapToDto(employee);
    }

    public async Task<IReadOnlyList<EmployeeDto>> GetByServiceIdAsync(int serviceId, CancellationToken cancellationToken = default)
    {
        var employees = await _unitOfWork.Employees.GetEmployeesByServiceIdAsync(serviceId, cancellationToken);
        return employees.Select(MapToDto).ToList();
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new BusinessException("Personel adı boş olamaz.");

        var employee = new Employee
        {
            FullName = dto.FullName.Trim(),
            Title = dto.Title?.Trim(),
            UserId = dto.UserId,
            IsActive = true
        };

        if (dto.ServiceIds.Any())
        {
            var validServices = await _unitOfWork.Services.GetByIdsAsync(dto.ServiceIds, cancellationToken);
            foreach (var s in validServices)
            {
                employee.EmployeeServices.Add(new EmployeeServiceEntity
                {
                    ServiceId = s.Id,
                    Employee = employee
                });
            }
        }

        await _unitOfWork.Employees.AddAsync(employee, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(employee.Id, cancellationToken) ?? MapToDto(employee);
    }

    public async Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeDto dto, CancellationToken cancellationToken = default)
    {
        var employee = await _unitOfWork.Employees.GetByIdAsync(id, cancellationToken);
        if (employee == null)
            throw new NotFoundException($"ID: {id} olan personel bulunamadı.");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new BusinessException("Personel adı boş olamaz.");

        employee.FullName = dto.FullName.Trim();
        employee.Title = dto.Title?.Trim();
        employee.UserId = dto.UserId;
        employee.IsActive = dto.IsActive;

        _unitOfWork.Employees.Update(employee);

        if (dto.ServiceIds != null)
        {
            var validServiceIds = new List<int>();
            if (dto.ServiceIds.Any())
            {
                var validServices = await _unitOfWork.Services.GetByIdsAsync(dto.ServiceIds, cancellationToken);
                validServiceIds = validServices.Select(s => s.Id).ToList();
            }

            await _unitOfWork.Employees.UpdateEmployeeServicesAsync(id, validServiceIds, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(employee.Id, cancellationToken) ?? MapToDto(employee);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var employee = await _unitOfWork.Employees.GetByIdAsync(id, cancellationToken);
        if (employee == null)
            throw new NotFoundException($"ID: {id} olan personel bulunamadı.");

        // Soft delete (Randevu ve servis kayıt bütünlüğü için IsActive = false)
        employee.IsActive = false;
        _unitOfWork.Employees.Update(employee);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task AssignServicesAsync(int employeeId, List<int> serviceIds, CancellationToken cancellationToken = default)
    {
        var employee = await _unitOfWork.Employees.GetByIdAsync(employeeId, cancellationToken);
        if (employee == null)
            throw new NotFoundException($"ID: {employeeId} olan personel bulunamadı.");

        var validServices = serviceIds.Any()
            ? await _unitOfWork.Services.GetByIdsAsync(serviceIds, cancellationToken)
            : new List<Service>();

        var validServiceIds = validServices.Select(s => s.Id).ToList();
        await _unitOfWork.Employees.UpdateEmployeeServicesAsync(employeeId, validServiceIds, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static EmployeeDto MapToDto(Employee e) => new()
    {
        Id = e.Id,
        UserId = e.UserId,
        FullName = e.FullName,
        Title = e.Title,
        IsActive = e.IsActive,
        Services = e.EmployeeServices
            .Where(es => es.Service != null)
            .Select(es => new ServiceDto
            {
                Id = es.Service.Id,
                Name = es.Service.Name,
                DurationMinutes = es.Service.DurationMinutes,
                Price = es.Service.Price,
                IsActive = es.Service.IsActive
            }).ToList()
    };
}
