using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.Common;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Security;
using EmployeeServiceEntity = BarberAppointment.Domain.Entities.EmployeeService;

namespace BarberAppointment.Services.Implementations;

public class EmployeeService : IEmployeeService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public EmployeeService(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
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

    public async Task<IReadOnlyList<EmployeeDto>> GetByMultipleServiceIdsAsync(IEnumerable<int> serviceIds, CancellationToken cancellationToken = default)
    {
        var employees = await _unitOfWork.Employees.GetEmployeesByMultipleServiceIdsAsync(serviceIds, cancellationToken);
        return employees.Select(MapToDto).ToList();
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new BusinessException("Personel adı boş olamaz.");

        int? createdUserId = dto.UserId;

        // E-posta adresi belirtilmişse yeni kullanıcı hesabı oluşturulur
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var existingUser = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
            if (existingUser != null)
            {
                throw new ConflictException($"'{dto.Email}' e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır.");
            }

            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                throw new BusinessException("Personel hesabı için şifre girilmelidir.");
            }

            _passwordHasher.CreatePasswordHash(dto.Password, out var passwordHash, out var passwordSalt);

            var newUser = new User
            {
                FullName = dto.FullName.Trim(),
                Email = normalizedEmail,
                Phone = !string.IsNullOrWhiteSpace(dto.Phone) ? TurkishPhoneNumberHelper.Normalize(dto.Phone) : null,
                Role = UserRole.Employee,
                PasswordHash = passwordHash,
                PasswordSalt = passwordSalt,
                IsActive = true,
                IsEmailVerified = true,
                IsPhoneVerified = true
            };

            await _unitOfWork.Users.AddAsync(newUser, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            createdUserId = newUser.Id;
        }

        var employee = new Employee
        {
            FullName = dto.FullName.Trim(),
            Title = dto.Title?.Trim(),
            UserId = createdUserId,
            IsActive = true,
            WorkStartTime = dto.WorkStartTime != default ? dto.WorkStartTime : new TimeSpan(9, 0, 0),
            WorkEndTime = dto.WorkEndTime != default ? dto.WorkEndTime : new TimeSpan(19, 0, 0),
            WeeklyOffDay = dto.WeeklyOffDay,
            WorkingDays = dto.WorkingDays
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

        // Kullanıcı hesap yönetimi (E-posta ve şifre güncelleme veya yeni hesap bağlama)
        if (employee.UserId.HasValue)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(employee.UserId.Value, cancellationToken);
            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Email))
                {
                    var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
                    if (user.Email != normalizedEmail)
                    {
                        var emailCollision = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
                        if (emailCollision != null && emailCollision.Id != user.Id)
                        {
                            throw new ConflictException($"'{dto.Email}' e-posta adresi başka bir kullanıcı tarafından kullanılmaktadır.");
                        }
                        user.Email = normalizedEmail;
                    }
                }

                if (!string.IsNullOrWhiteSpace(dto.Phone))
                {
                    user.Phone = TurkishPhoneNumberHelper.Normalize(dto.Phone);
                }

                if (!string.IsNullOrWhiteSpace(dto.Password))
                {
                    _passwordHasher.CreatePasswordHash(dto.Password, out var passwordHash, out var passwordSalt);
                    user.PasswordHash = passwordHash;
                    user.PasswordSalt = passwordSalt;
                }

                user.FullName = dto.FullName.Trim();
                user.IsActive = dto.IsActive;
                _unitOfWork.Users.Update(user);
            }
        }
        else if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            // Önceden hesabı olmayan bir personele ilk kez hesap tanımlanması
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            var existingUser = await _unitOfWork.Users.GetByEmailAsync(normalizedEmail, cancellationToken);
            if (existingUser != null)
            {
                throw new ConflictException($"'{dto.Email}' e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır.");
            }

            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                throw new BusinessException("Yeni personel hesabı için şifre girilmelidir.");
            }

            _passwordHasher.CreatePasswordHash(dto.Password, out var passwordHash, out var passwordSalt);

            var newUser = new User
            {
                FullName = dto.FullName.Trim(),
                Email = normalizedEmail,
                Phone = !string.IsNullOrWhiteSpace(dto.Phone) ? TurkishPhoneNumberHelper.Normalize(dto.Phone) : null,
                Role = UserRole.Employee,
                PasswordHash = passwordHash,
                PasswordSalt = passwordSalt,
                IsActive = dto.IsActive,
                IsEmailVerified = true,
                IsPhoneVerified = true
            };

            await _unitOfWork.Users.AddAsync(newUser, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            employee.UserId = newUser.Id;
        }

        employee.FullName = dto.FullName.Trim();
        employee.Title = dto.Title?.Trim();
        if (employee.UserId == null && dto.UserId.HasValue)
            employee.UserId = dto.UserId;
        employee.IsActive = dto.IsActive;
        if (dto.WorkStartTime != default)
            employee.WorkStartTime = dto.WorkStartTime;
        if (dto.WorkEndTime != default)
            employee.WorkEndTime = dto.WorkEndTime;
        employee.WeeklyOffDay = dto.WeeklyOffDay;
        employee.WorkingDays = dto.WorkingDays;

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

        if (employee.UserId.HasValue)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(employee.UserId.Value, cancellationToken);
            if (user != null)
            {
                user.IsActive = false;
                _unitOfWork.Users.Update(user);
            }
        }

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
        Email = e.User?.Email,
        Phone = e.User?.Phone,
        Title = e.Title,
        IsActive = e.IsActive,
        WorkStartTime = e.WorkStartTime,
        WorkEndTime = e.WorkEndTime,
        WeeklyOffDay = e.WeeklyOffDay,
        WorkingDays = e.WorkingDays,
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
