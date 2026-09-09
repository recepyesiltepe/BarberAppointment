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
    private readonly IEmailService _emailService;

    public AppointmentService(
        IUnitOfWork unitOfWork,
        IWorkHoursPolicy workHoursPolicy,
        IDateTimeProvider dateTimeProvider,
        IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _workHoursPolicy = workHoursPolicy;
        _dateTimeProvider = dateTimeProvider;
        _emailService = emailService;
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

    public Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default)
        => CreateAsync(dto, null, false, cancellationToken);

    public async Task<AppointmentDto> CreateAsync(
        CreateAppointmentDto dto,
        int? requestingUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        // Yetki / Randevu sahipliği kontrolü: Müşteri başkası adına randevu alamaz
        if (requestingUserId.HasValue && !isAdmin && dto.UserId != requestingUserId.Value)
            throw new ForbiddenException("Başkası adına randevu oluşturma yetkiniz bulunmamaktadır.");

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

        // 6.1. Personel izin günü kontrolü
        if (employee.WeeklyOffDay.HasValue && dto.StartAt.DayOfWeek == employee.WeeklyOffDay.Value)
            throw new BusinessException($"'{employee.FullName}' personeli {dto.StartAt:dddd} günleri izinlidir.");

        // 7. İş Kuralı: Çalışma saatleri politikası kontrolü (Personel mesaisi ve Salon politikası)
        var empWorkStart = employee.WorkStartTime != default ? employee.WorkStartTime : _workHoursPolicy.WorkDayStart;
        var empWorkEnd = employee.WorkEndTime != default ? employee.WorkEndTime : _workHoursPolicy.WorkDayEnd;

        if (dto.StartAt.TimeOfDay < empWorkStart || endAt.TimeOfDay > empWorkEnd)
            throw new BusinessException($"Randevu saat aralığı ({dto.StartAt:HH:mm}–{endAt:HH:mm}) personelin çalışma saatleri ({empWorkStart:hh\\:mm}–{empWorkEnd:hh\\:mm}) dışındadır.");

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

        // Audit Log: Randevu oluşturma kaydı
        if (_unitOfWork.AuditLogs != null)
        {
            var auditLog = new AppointmentAuditLog
            {
                AppointmentId = appointment.Id,
                Action = "Created",
                OldStatus = null,
                NewStatus = AppointmentStatus.Confirmed.ToString(),
                ChangedByUserId = requestingUserId ?? dto.UserId,
                ChangedByRole = isAdmin ? "Admin" : "Customer",
                ChangedByName = user.FullName,
                ChangedDate = _dateTimeProvider.UtcNow,
                Details = $"Randevu oluşturuldu: {dto.StartAt:yyyy-MM-dd HH:mm} (Hizmet: {service.Name}, Personel: {employee.FullName})"
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        // DTO dönüşümü için navigation'ları doldur
        appointment.User = user;
        appointment.Employee = employee;
        appointment.Service = service;

        var resultDto = MapToDto(appointment);

        // Ek Geliştirme 1: Müşteriye randevu onay e-postası gönder
        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            await _emailService.SendAppointmentConfirmationAsync(resultDto, user.Email, cancellationToken);
        }

        return resultDto;
    }

    public Task<AppointmentDto> RescheduleAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default)
        => RescheduleAsync(id, dto, null, false, cancellationToken);

    public async Task<AppointmentDto> RescheduleAsync(
        int id,
        UpdateAppointmentDto dto,
        int? requestingUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        // Yetki / Randevu sahipliği kontrolü
        if (requestingUserId.HasValue && !isAdmin && appointment.UserId != requestingUserId.Value)
            throw new ForbiddenException("Yalnızca kendi randevunuzu yeniden zamanlayabilirsiniz.");

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

        // Personel haftalık izin günü kontrolü
        if (appointment.Employee.WeeklyOffDay.HasValue && dto.StartAt.DayOfWeek == appointment.Employee.WeeklyOffDay.Value)
            throw new BusinessException($"'{appointment.Employee.FullName}' personeli {dto.StartAt:dddd} günleri izinlidir.");

        // Çalışma saatleri politikası kontrolü (Personel mesaisi ve Salon politikası)
        var empWorkStart = appointment.Employee.WorkStartTime != default ? appointment.Employee.WorkStartTime : _workHoursPolicy.WorkDayStart;
        var empWorkEnd = appointment.Employee.WorkEndTime != default ? appointment.Employee.WorkEndTime : _workHoursPolicy.WorkDayEnd;

        if (dto.StartAt.TimeOfDay < empWorkStart || newEndAt.TimeOfDay > empWorkEnd)
            throw new BusinessException($"Seçilen saat aralığı ({dto.StartAt:HH:mm}–{newEndAt:HH:mm}) personelin çalışma saatleri ({empWorkStart:hh\\:mm}–{empWorkEnd:hh\\:mm}) dışındadır.");

        if (!_workHoursPolicy.IsWithinWorkHours(dto.StartAt, newEndAt))
            throw new BusinessException($"Seçilen saat aralığı ({dto.StartAt:HH:mm}–{newEndAt:HH:mm}) salon çalışma saatleri dışındadır.");

        // Çakışma kontrolü (mevcut randevu hariç)
        var hasConflict = await _unitOfWork.Appointments.HasConflictAsync(appointment.EmployeeId, dto.StartAt, newEndAt, excludeAppointmentId: id, cancellationToken: cancellationToken);
        if (hasConflict)
            throw new ConflictException($"Seçilen saat aralığı ({dto.StartAt:HH:mm}–{newEndAt:HH:mm}) için personelin başka bir randevusu bulunmaktadır.");

        var oldStartAt = appointment.StartAt;
        var oldStatus = appointment.Status.ToString();

        appointment.StartAt = dto.StartAt;
        appointment.EndAt = newEndAt;
        appointment.Notes = dto.Notes ?? appointment.Notes;
        appointment.Status = AppointmentStatus.Confirmed;

        _unitOfWork.Appointments.Update(appointment);

        // Audit Log: Randevu güncelleme / yeniden zamanlama kaydı
        if (_unitOfWork.AuditLogs != null)
        {
            var auditLog = new AppointmentAuditLog
            {
                AppointmentId = appointment.Id,
                Action = "Rescheduled",
                OldStatus = oldStatus,
                NewStatus = AppointmentStatus.Confirmed.ToString(),
                ChangedByUserId = requestingUserId,
                ChangedByRole = isAdmin ? "Admin" : "Customer",
                ChangedByName = (requestingUserId.HasValue && requestingUserId.Value == appointment.UserId) ? appointment.User?.FullName : (isAdmin ? "Admin" : "Personel"),
                ChangedDate = _dateTimeProvider.UtcNow,
                Details = $"Randevu yeniden zamanlandı. Eski saat: {oldStartAt:yyyy-MM-dd HH:mm}, Yeni saat: {dto.StartAt:yyyy-MM-dd HH:mm}"
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updatedDto = MapToDto(appointment);

        // Ek Geliştirme 1: Müşteriye randevu güncelleme e-postası gönder
        if (!string.IsNullOrWhiteSpace(appointment.User?.Email))
        {
            await _emailService.SendAppointmentRescheduledAsync(updatedDto, appointment.User.Email, cancellationToken);
        }

        return updatedDto;
    }

    public Task CancelAsync(int id, CancellationToken cancellationToken = default)
        => CancelAsync(id, null, false, cancellationToken);

    public async Task CancelAsync(
        int id,
        int? requestingUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        // Yetki / Randevu sahipliği kontrolü
        if (requestingUserId.HasValue && !isAdmin && appointment.UserId != requestingUserId.Value)
            throw new ForbiddenException("Yalnızca kendi randevunuzu iptal edebilirsiniz.");

        // FR-R07: Tamamlanmış randevu iptal edilemez
        if (appointment.Status == AppointmentStatus.Completed)
            throw new BusinessException("Tamamlanmış bir randevu iptal edilemez.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BusinessException("Bu randevu zaten iptal edilmiştir.");

        var oldStatus = appointment.Status.ToString();

        // FR-R06: İptal → slot serbest kalır
        appointment.Status = AppointmentStatus.Cancelled;
        _unitOfWork.Appointments.Update(appointment);

        // Audit Log: Randevu iptal kaydı
        if (_unitOfWork.AuditLogs != null)
        {
            var auditLog = new AppointmentAuditLog
            {
                AppointmentId = appointment.Id,
                Action = "Cancelled",
                OldStatus = oldStatus,
                NewStatus = AppointmentStatus.Cancelled.ToString(),
                ChangedByUserId = requestingUserId,
                ChangedByRole = isAdmin ? "Admin" : "Customer",
                ChangedByName = (requestingUserId.HasValue && requestingUserId.Value == appointment.UserId) ? appointment.User?.FullName : (isAdmin ? "Admin" : "Personel"),
                ChangedDate = _dateTimeProvider.UtcNow,
                Details = "Randevu iptal edildi."
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Ek Geliştirme 1: Müşteriye randevu iptal e-postası gönder
        if (!string.IsNullOrWhiteSpace(appointment.User?.Email))
        {
            await _emailService.SendAppointmentCancellationAsync(MapToDto(appointment), appointment.User.Email, cancellationToken);
        }
    }

    public Task CompleteAsync(int id, CancellationToken cancellationToken = default)
        => CompleteAsync(id, null, false, cancellationToken);

    public async Task CompleteAsync(
        int id,
        int? requestingUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _unitOfWork.Appointments.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"ID: {id} olan randevu bulunamadı.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BusinessException("İptal edilmiş bir randevu tamamlanamaz.");

        if (appointment.Status == AppointmentStatus.Completed)
            throw new BusinessException("Bu randevu zaten tamamlanmış.");

        var oldStatus = appointment.Status.ToString();
        appointment.Status = AppointmentStatus.Completed;
        _unitOfWork.Appointments.Update(appointment);

        // Audit Log: Randevu tamamlama kaydı
        if (_unitOfWork.AuditLogs != null)
        {
            var auditLog = new AppointmentAuditLog
            {
                AppointmentId = appointment.Id,
                Action = "Completed",
                OldStatus = oldStatus,
                NewStatus = AppointmentStatus.Completed.ToString(),
                ChangedByUserId = requestingUserId,
                ChangedByRole = isAdmin ? "Admin" : "Employee",
                ChangedByName = isAdmin ? "Admin" : "Personel",
                ChangedDate = _dateTimeProvider.UtcNow,
                Details = "Randevu tamamlandı olarak işaretlendi."
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        }

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

        // 1. Personel haftalık izin günü kontrolü (İzinliyse slot üretilmez)
        if (employee.WeeklyOffDay.HasValue && targetDate.DayOfWeek == employee.WeeklyOffDay.Value)
        {
            return Array.Empty<AvailableSlotDto>();
        }

        // 2. Personel çalışma saatlerini belirle (Varsayılan yoksa salon politikası)
        var workStart = employee.WorkStartTime != default ? employee.WorkStartTime : _workHoursPolicy.WorkDayStart;
        var workEnd = employee.WorkEndTime != default ? employee.WorkEndTime : _workHoursPolicy.WorkDayEnd;

        var dayStart = targetDate.Add(workStart);
        var dayEnd = targetDate.Add(workEnd);

        // O günkü onaylı/bekleyen randevuları al
        var existingAppointments = await _unitOfWork.Appointments
            .GetByEmployeeAndDateRangeAsync(query.EmployeeId, dayStart, dayEnd, cancellationToken);

        var slots = new List<AvailableSlotDto>();
        var slotDuration = service.DurationMinutes;
        var cursor = dayStart;
        var nowUtc = _dateTimeProvider.UtcNow;

        while (cursor.AddMinutes(slotDuration) <= dayEnd)
        {
            var slotEnd = cursor.AddMinutes(slotDuration);

            // 3. Geçmiş zamana ait slotlar listelenmemeli
            if (cursor < nowUtc)
            {
                cursor = cursor.AddMinutes(slotDuration);
                continue;
            }

            // 4. Bu slot herhangi bir mevcut randevuyla çakışıyor mu? (Dolu slotlar listelenmemeli)
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
