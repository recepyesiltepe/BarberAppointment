using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;

namespace BarberAppointment.Services.Implementations;

public class AppointmentService : IAppointmentService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWorkHoursPolicy _workHoursPolicy;
    private readonly IDateTimeProvider _dateTimeProvider;

    public AppointmentService(
        IUnitOfWork unitOfWork,
        IWorkHoursPolicy workHoursPolicy,
        IDateTimeProvider dateTimeProvider)
    {
        _unitOfWork = unitOfWork;
        _workHoursPolicy = workHoursPolicy;
        _dateTimeProvider = dateTimeProvider;
    }

    // ─── Sorgular ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<AppointmentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var appointments = await _unitOfWork.Appointments.GetAppointmentsWithDetailsAsync(cancellationToken);
        return appointments.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetFilteredAsync(AppointmentFilterDto filter, CancellationToken cancellationToken = default)
    {
        var appointments = await _unitOfWork.Appointments.GetFilteredAsync(
            filter.EmployeeId,
            filter.UserId,
            filter.Status,
            filter.StartDate,
            filter.EndDate,
            cancellationToken);

        return appointments.Select(MapToDto).ToList();
    }

    public async Task<AppointmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdWithDetailsAsync(id, cancellationToken);
        if (appointment == null)
            throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        return MapToDto(appointment);
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetByEmployeeAsync(int employeeId, DateTime date, CancellationToken cancellationToken = default)
    {
        var startOfDay = date.Date;
        var endOfDay = startOfDay.AddDays(1).AddTicks(-1);
        var appointments = await _unitOfWork.Appointments.GetByEmployeeAndDateRangeAsync(employeeId, startOfDay, endOfDay, cancellationToken);
        return appointments.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetByUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var appointments = await _unitOfWork.Appointments.GetByUserIdAsync(userId, cancellationToken);
        return appointments.Select(MapToDto).ToList();
    }

    // ─── Komutlar ────────────────────────────────────────────────────────────

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        // 1. İş Kuralı (FR-R04): Geçmiş zamana randevu alınamaz (5 dk tolerans)
        if (dto.StartAt < _dateTimeProvider.UtcNow.AddMinutes(-5))
            throw new BusinessException("Geçmiş bir zamana randevu oluşturulamaz.");

        // 2. İş Kuralı (FR-K03): Müşteri aktiflik kontrolü
        var user = await _unitOfWork.Users.GetByIdAsync(dto.UserId, cancellationToken)
            ?? throw new NotFoundException($"ID: {dto.UserId} olan kullanıcı bulunamadı.");

        if (!user.IsActive)
            throw new BusinessException("Hesabı pasif olan müşteri için randevu oluşturulamaz.");

        // 3. İş Kuralı (FR-H03): Hizmet aktiflik kontrolü
        var service = await _unitOfWork.Services.GetByIdAsync(dto.ServiceId, cancellationToken)
            ?? throw new NotFoundException($"ID: {dto.ServiceId} olan hizmet bulunamadı.");

        if (!service.IsActive)
            throw new BusinessException($"'{service.Name}' hizmeti aktif değildir.");

        // 4. İş Kuralı (FR-P03): Personel aktiflik kontrolü
        var employee = await _unitOfWork.Employees.GetByIdWithServicesAsync(dto.EmployeeId, cancellationToken)
            ?? throw new NotFoundException($"ID: {dto.EmployeeId} olan personel bulunamadı.");

        if (!employee.IsActive)
            throw new BusinessException($"'{employee.FullName}' personeli aktif değildir.");

        // 5. İş Kuralı (FR-R02): Personel hizmet yetkinlik kontrolü
        var canPerformService = employee.EmployeeServices.Any(es => es.ServiceId == dto.ServiceId);
        if (!canPerformService)
            throw new BusinessException($"'{employee.FullName}' personeli '{service.Name}' hizmetini sunmamaktadır.");

        // 6. İş Kuralı (FR-H04): Bitiş zamanı otomatik hesaplama
        var endAt = dto.StartAt.AddMinutes(service.DurationMinutes);

        // 7. İş Kuralı: Çalışma saatleri politikası kontrolü (OCP)
        if (!_workHoursPolicy.IsWithinWorkHours(dto.StartAt, endAt))
            throw new BusinessException($"Randevu saat aralığı ({dto.StartAt:HH:mm}–{endAt:HH:mm}) salon çalışma saatleri ({_workHoursPolicy.WorkDayStart:hh\\:mm}–{_workHoursPolicy.WorkDayEnd:hh\\:mm}) dışındadır.");

        // 8. İş Kuralı (FR-R03): Çakışma kontrolü
        var hasConflict = await _unitOfWork.Appointments.HasConflictAsync(dto.EmployeeId, dto.StartAt, endAt, cancellationToken: cancellationToken);
        if (hasConflict)
            throw new ConflictException($"'{employee.FullName}' personelinin {dto.StartAt:HH:mm}–{endAt:HH:mm} saatleri arasında başka bir randevusu bulunmaktadır.");

        var appointment = new Appointment
        {
            UserId = dto.UserId,
            EmployeeId = dto.EmployeeId,
            ServiceId = dto.ServiceId,
            StartAt = dto.StartAt,
            EndAt = endAt,
            Status = AppointmentStatus.Confirmed,
            Notes = dto.Notes
        };

        await _unitOfWork.Appointments.AddAsync(appointment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // DTO dönüşümü için navigation'ları doldur
        appointment.User = user;
        appointment.Employee = employee;
        appointment.Service = service;

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> RescheduleAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        // İptal veya tamamlanmış randevu yeniden zamanlanamaz
        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BusinessException("İptal edilmiş randevu yeniden zamanlanamaz.");

        if (appointment.Status == AppointmentStatus.Completed)
            throw new BusinessException("Tamamlanmış randevu yeniden zamanlanamaz.");

        // Geçmiş zamana taşınamaz
        if (dto.StartAt < _dateTimeProvider.UtcNow.AddMinutes(-5))
            throw new BusinessException("Randevu geçmiş bir zamana alınamaz.");

        // Personelin aktifliğini tekrar doğrula
        if (!appointment.Employee!.IsActive)
            throw new BusinessException($"'{appointment.Employee.FullName}' personeli artık aktif değildir.");

        var serviceDuration = appointment.Service!.DurationMinutes;
        var newEndAt = dto.StartAt.AddMinutes(serviceDuration);

        // Çalışma saatleri politikası kontrolü (OCP)
        if (!_workHoursPolicy.IsWithinWorkHours(dto.StartAt, newEndAt))
            throw new BusinessException($"Seçilen saat aralığı ({dto.StartAt:HH:mm}–{newEndAt:HH:mm}) salon çalışma saatleri dışındadır.");

        // Çakışma kontrolü (mevcut randevu hariç)
        var hasConflict = await _unitOfWork.Appointments.HasConflictAsync(appointment.EmployeeId, dto.StartAt, newEndAt, excludeAppointmentId: id, cancellationToken: cancellationToken);
        if (hasConflict)
            throw new ConflictException($"Seçilen saat aralığı ({dto.StartAt:HH:mm}–{newEndAt:HH:mm}) için personelin başka bir randevusu bulunmaktadır.");

        appointment.StartAt = dto.StartAt;
        appointment.EndAt = newEndAt;
        appointment.Notes = dto.Notes ?? appointment.Notes;
        appointment.Status = AppointmentStatus.Confirmed;

        _unitOfWork.Appointments.Update(appointment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(appointment);
    }

    public async Task CancelAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        // FR-R07: Tamamlanmış randevu iptal edilemez
        if (appointment.Status == AppointmentStatus.Completed)
            throw new BusinessException("Tamamlanmış bir randevu iptal edilemez.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BusinessException("Bu randevu zaten iptal edilmiştir.");

        // FR-R06: İptal → slot serbest kalır
        appointment.Status = AppointmentStatus.Cancelled;
        _unitOfWork.Appointments.Update(appointment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task CompleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BusinessException("İptal edilmiş bir randevu tamamlanamaz.");

        if (appointment.Status == AppointmentStatus.Completed)
            throw new BusinessException("Bu randevu zaten tamamlanmış.");

        appointment.Status = AppointmentStatus.Completed;
        _unitOfWork.Appointments.Update(appointment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AvailableSlotDto>> GetAvailableSlotsAsync(AvailableSlotsQueryDto query, CancellationToken cancellationToken = default)
    {
        // Hizmet süresini öğren
        var service = await _unitOfWork.Services.GetByIdAsync(query.ServiceId, cancellationToken)
            ?? throw new NotFoundException($"ID: {query.ServiceId} olan hizmet bulunamadı.");

        // Personeli doğrula
        var employee = await _unitOfWork.Employees.GetByIdAsync(query.EmployeeId, cancellationToken)
            ?? throw new NotFoundException($"ID: {query.EmployeeId} olan personel bulunamadı.");

        if (!employee.IsActive)
            throw new BusinessException($"'{employee.FullName}' personeli aktif değildir.");

        var targetDate = query.Date.Date;
        var dayStart = targetDate.Add(_workHoursPolicy.WorkDayStart);
        var dayEnd = targetDate.Add(_workHoursPolicy.WorkDayEnd);

        // O günkü onaylı/bekleyen randevuları al
        var existingAppointments = await _unitOfWork.Appointments
            .GetByEmployeeAndDateRangeAsync(query.EmployeeId, dayStart, dayEnd, cancellationToken);

        var slots = new List<AvailableSlotDto>();
        var slotDuration = service.DurationMinutes;
        var cursor = dayStart;

        while (cursor.AddMinutes(slotDuration) <= dayEnd)
        {
            var slotEnd = cursor.AddMinutes(slotDuration);

            // Bu slot herhangi bir mevcut randevuyla çakışıyor mu?
            var isOccupied = existingAppointments.Any(a =>
                cursor < a.EndAt && slotEnd > a.StartAt);

            if (!isOccupied)
            {
                slots.Add(new AvailableSlotDto
                {
                    StartAt = cursor,
                    EndAt = slotEnd,
                    DurationMinutes = slotDuration
                });
            }

            cursor = cursor.AddMinutes(slotDuration);
        }

        return slots;
    }

    // ─── Yardımcı dönüşüm ────────────────────────────────────────────────────

    private static AppointmentDto MapToDto(Appointment a) => new()
    {
        Id = a.Id,
        UserId = a.UserId,
        CustomerName = a.User?.FullName ?? string.Empty,
        CustomerPhone = a.User?.Phone ?? string.Empty,
        EmployeeId = a.EmployeeId,
        EmployeeName = a.Employee?.FullName ?? string.Empty,
        ServiceId = a.ServiceId,
        ServiceName = a.Service?.Name ?? string.Empty,
        Price = a.Service?.Price ?? 0,
        DurationMinutes = a.Service?.DurationMinutes ?? 0,
        StartAt = a.StartAt,
        EndAt = a.EndAt,
        Status = a.Status,
        Notes = a.Notes,
        CreatedAt = a.CreatedAt
    };
}
