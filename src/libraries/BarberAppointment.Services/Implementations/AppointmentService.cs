using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Core.Results;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace BarberAppointment.Services.Implementations;

public class AppointmentService : IAppointmentService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWorkHoursPolicy _workHoursPolicy;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IEmailService _emailService;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(
        IUnitOfWork unitOfWork,
        IWorkHoursPolicy workHoursPolicy,
        IDateTimeProvider dateTimeProvider,
        IEmailService emailService,
        ILogger<AppointmentService>? logger = null)
    {
        _unitOfWork = unitOfWork;
        _workHoursPolicy = workHoursPolicy;
        _dateTimeProvider = dateTimeProvider;
        _emailService = emailService;
        _logger = logger ?? NullLogger<AppointmentService>.Instance;
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
            filter.Search,
            cancellationToken);

        return appointments.Select(MapToDto).ToList();
    }

    public async Task<PagedResult<AppointmentDto>> GetPagedAsync(AppointmentFilterDto filter, CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await _unitOfWork.Appointments.GetPagedAsync(
            filter.EmployeeId,
            filter.UserId,
            filter.Status,
            filter.StartDate,
            filter.EndDate,
            filter.Search,
            filter.PageNumber,
            filter.PageSize,
            cancellationToken);

        var dtos = items.Select(MapToDto).ToList();
        return new PagedResult<AppointmentDto>(dtos, totalCount, filter.PageNumber, filter.PageSize);
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
        {
            _logger.LogWarning("Randevu oluşturma engellendi: Yetkisiz kullanıcı işlemi. RequestingUserId={RequestingUserId}, TargetUserId={TargetUserId}", requestingUserId, dto.UserId);
            throw new ForbiddenException("Başkası adına randevu oluşturma yetkiniz bulunmamaktadır.");
        }

        // 1. İş Kuralı (FR-R04): Geçmiş zamana randevu alınamaz
        if (_dateTimeProvider.IsInPast(dto.StartAt))
        {
            _logger.LogWarning("Geçmiş zamana randevu oluşturma denemesi reddedildi: UserId={UserId}, StartAt={StartAt}, TurkeyNow={Now}", dto.UserId, dto.StartAt, _dateTimeProvider.TurkeyNow);
            throw new BusinessException("Geçmiş bir zamana randevu oluşturulamaz.");
        }

        // 2. İş Kuralı (FR-K03): Müşteri aktiflik kontrolü
        var user = await _unitOfWork.Users.GetByIdAsync(dto.UserId, cancellationToken)
            ?? throw new NotFoundException($"ID: {dto.UserId} olan kullanıcı bulunamadı.");

        if (!user.IsActive)
        {
            _logger.LogWarning("Pasif kullanıcı için randevu oluşturma denemesi reddedildi: UserId={UserId}", dto.UserId);
            throw new BusinessException("Hesabı pasif olan müşteri için randevu oluşturulamaz.");
        }

        // Hizmet ID'lerini belirle (ServiceIds öncelikli, yoksa ServiceId fallback)
        var targetServiceIds = dto.ServiceIds != null && dto.ServiceIds.Any(id => id > 0)
            ? dto.ServiceIds.Where(id => id > 0).Distinct().ToList()
            : new List<int> { dto.ServiceId };

        if (!targetServiceIds.Any() || targetServiceIds.All(id => id <= 0))
            throw new BusinessException("En az bir geçerli hizmet seçilmelidir.");

        // 3. İş Kuralı (FR-H03): Hizmet aktiflik ve varlık kontrolü
        List<Service> services;
        if (targetServiceIds.Count == 1)
        {
            var singleId = targetServiceIds[0];
            var s = await _unitOfWork.Services.GetByIdAsync(singleId, cancellationToken)
                ?? throw new NotFoundException($"ID: {singleId} olan hizmet bulunamadı.");
            services = new List<Service> { s };
        }
        else
        {
            var fetched = await _unitOfWork.Services.GetByIdsAsync(targetServiceIds, cancellationToken);
            if (fetched.Count != targetServiceIds.Count)
            {
                var missingIds = targetServiceIds.Except(fetched.Select(f => f.Id));
                throw new NotFoundException($"Seçilen hizmetler bulunamadı: {string.Join(", ", missingIds)}");
            }
            services = fetched.ToList();
        }

        foreach (var s in services)
        {
            if (!s.IsActive)
                throw new BusinessException($"'{s.Name}' hizmeti aktif değildir.");
        }

        // Kompozit & Alt Hizmet çakışma doğrulaması (Mutual exclusion)
        ValidateServicesConflict(services);

        // 4. İş Kuralı (FR-P03): Personel aktiflik kontrolü
        var employee = await _unitOfWork.Employees.GetByIdWithServicesAsync(dto.EmployeeId, cancellationToken)
            ?? throw new NotFoundException($"ID: {dto.EmployeeId} olan personel bulunamadı.");

        if (!employee.IsActive)
            throw new BusinessException($"'{employee.FullName}' personeli aktif değildir.");

        // 5. İş Kuralı (FR-R02): Personel hizmet yetkinlik kontrolü (Seçilen TÜM hizmetleri yerine getirebilmeli)
        var empServiceIds = employee.EmployeeServices
            .Where(es => es.Service == null || es.Service.IsActive)
            .Select(es => es.ServiceId)
            .ToHashSet();

        foreach (var srv in services)
        {
            bool canPerform;
            if (srv.IsComposite && srv.SubServiceItems != null && srv.SubServiceItems.Any())
            {
                var subIds = srv.SubServiceItems.Select(csi => csi.SubServiceId).ToList();
                canPerform = empServiceIds.Contains(srv.Id) || subIds.All(subId => empServiceIds.Contains(subId));
            }
            else
            {
                canPerform = empServiceIds.Contains(srv.Id);
            }

            if (!canPerform)
            {
                throw new BusinessException($"'{employee.FullName}' personeli '{srv.Name}' hizmetini sunmamaktadır veya paket içeriğindeki tüm alt hizmetleri karşılayamamaktadır.");
            }
        }

        // 6. İş Kuralı (FR-H04): Bitiş zamanı otomatik hesaplama (Tüm seçili hizmetlerin süreleri toplamı)
        var totalDuration = services.Sum(s => s.DurationMinutes);
        var endAt = dto.StartAt.AddMinutes(totalDuration);

        // 6.1. Personel çalışma günü kontrolü
        if (!employee.IsWorkingOn(dto.StartAt.DayOfWeek))
            throw new BusinessException($"'{employee.FullName}' personeli {dto.StartAt:dddd} günleri izinlidir (çalışmamaktadır).");

        // 6.2. Personel onaylı izin kontrolü
        if (_unitOfWork.EmployeeLeaves != null)
        {
            var hasLeaveConflict = await _unitOfWork.EmployeeLeaves.HasApprovedLeaveConflictAsync(
                dto.EmployeeId, dto.StartAt, endAt, cancellationToken: cancellationToken);
            if (hasLeaveConflict)
            {
                throw new BusinessException($"'{employee.FullName}' personeli seçilen tarih ve saatte izinlidir.");
            }
        }

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
        {
            _logger.LogWarning("Randevu çakışması tespit edildi: EmployeeId={EmployeeId}, StartAt={StartAt}, EndAt={EndAt}", dto.EmployeeId, dto.StartAt, endAt);
            throw new ConflictException($"'{employee.FullName}' personelinin {dto.StartAt:HH:mm}–{endAt:HH:mm} saatleri arasında başka bir randevusu bulunmaktadır.");
        }

        var primaryService = services.First();

        var appointment = new Appointment
        {
            UserId = dto.UserId,
            EmployeeId = dto.EmployeeId,
            ServiceId = primaryService.Id,
            StartAt = dto.StartAt,
            EndAt = endAt,
            Status = AppointmentStatus.Confirmed,
            Notes = dto.Notes
        };

        foreach (var srv in services)
        {
            appointment.AppointmentServices.Add(new AppointmentServiceItem
            {
                ServiceId = srv.Id,
                Price = srv.Price,
                DurationMinutes = srv.DurationMinutes,
                IsActive = true
            });
        }

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
                ChangedDate = _dateTimeProvider.TurkeyNow,
                Details = $"Randevu oluşturuldu: {dto.StartAt:yyyy-MM-dd HH:mm} (Hizmetler: {string.Join(", ", services.Select(s => s.Name))}, Toplam Süre: {totalDuration} dk, Personel: {employee.FullName})"
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        // DTO dönüşümü için navigation'ları doldur
        appointment.User = user;
        appointment.Employee = employee;
        appointment.Service = primaryService;
        foreach (var asi in appointment.AppointmentServices)
        {
            asi.Service = services.FirstOrDefault(s => s.Id == asi.ServiceId) ?? primaryService;
        }

        var resultDto = MapToDto(appointment);

        _logger.LogInformation(
            "Randevu başarıyla oluşturuldu: AppointmentId={AppointmentId}, UserId={UserId}, EmployeeId={EmployeeId}, ServiceId={ServiceId}, StartAt={StartAt}, EndAt={EndAt}",
            appointment.Id, appointment.UserId, appointment.EmployeeId, appointment.ServiceId, appointment.StartAt, appointment.EndAt);

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
        {
            _logger.LogWarning("Randevu yeniden zamanlama engellendi: Yetkisiz kullanıcı işlemi. AppointmentId={AppointmentId}, RequestingUserId={RequestingUserId}", id, requestingUserId);
            throw new ForbiddenException("Yalnızca kendi randevunuzu yeniden zamanlayabilirsiniz.");
        }

        // İptal veya tamamlanmış randevu yeniden zamanlanamaz
        if (appointment.Status == AppointmentStatus.Cancelled)
        {
            _logger.LogWarning("İptal edilmiş randevu yeniden zamanlanamaz: AppointmentId={AppointmentId}", id);
            throw new BusinessException("İptal edilmiş randevu yeniden zamanlanamaz.");
        }

        if (appointment.Status == AppointmentStatus.Completed)
        {
            _logger.LogWarning("Tamamlanmış randevu yeniden zamanlanamaz: AppointmentId={AppointmentId}", id);
            throw new BusinessException("Tamamlanmış randevu yeniden zamanlanamaz.");
        }

        // Geçmiş zamana taşınamaz
        if (_dateTimeProvider.IsInPast(dto.StartAt))
        {
            _logger.LogWarning("Geçmiş zamana randevu güncelleme denemesi reddedildi: AppointmentId={AppointmentId}, StartAt={StartAt}, TurkeyNow={Now}", id, dto.StartAt, _dateTimeProvider.TurkeyNow);
            throw new BusinessException("Randevu geçmiş bir zamana alınamaz.");
        }

        // Personelin aktifliğini tekrar doğrula
        if (!appointment.Employee!.IsActive)
            throw new BusinessException($"'{appointment.Employee.FullName}' personeli artık aktif değildir.");

        var serviceDuration = appointment.Service!.DurationMinutes;
        var newEndAt = dto.StartAt.AddMinutes(serviceDuration);

        // Personel çalışma günü kontrolü
        if (!appointment.Employee.IsWorkingOn(dto.StartAt.DayOfWeek))
            throw new BusinessException($"'{appointment.Employee.FullName}' personeli {dto.StartAt:dddd} günleri izinlidir (çalışmamaktadır).");

        // Personel onaylı izin kontrolü
        if (_unitOfWork.EmployeeLeaves != null)
        {
            var hasLeaveConflict = await _unitOfWork.EmployeeLeaves.HasApprovedLeaveConflictAsync(
                appointment.EmployeeId, dto.StartAt, newEndAt, cancellationToken: cancellationToken);
            if (hasLeaveConflict)
            {
                throw new BusinessException($"'{appointment.Employee.FullName}' personeli seçilen tarih ve saatte izinlidir.");
            }
        }

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
        {
            _logger.LogWarning("Randevu yeniden zamanlama çakışması: AppointmentId={AppointmentId}, EmployeeId={EmployeeId}, NewStartAt={NewStartAt}", id, appointment.EmployeeId, dto.StartAt);
            throw new ConflictException($"Seçilen saat aralığı ({dto.StartAt:HH:mm}–{newEndAt:HH:mm}) için personelin başka bir randevusu bulunmaktadır.");
        }

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
                ChangedDate = _dateTimeProvider.TurkeyNow,
                Details = $"Randevu yeniden zamanlandı. Eski saat: {oldStartAt:yyyy-MM-dd HH:mm}, Yeni saat: {dto.StartAt:yyyy-MM-dd HH:mm}"
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Randevu başarıyla yeniden zamanlandı: AppointmentId={AppointmentId}, EskiTarih={OldStartAt}, YeniTarih={NewStartAt}",
            id, oldStartAt, dto.StartAt);

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
        {
            _logger.LogWarning("Randevu iptali engellendi: Yetkisiz kullanıcı işlemi. AppointmentId={AppointmentId}, RequestingUserId={RequestingUserId}", id, requestingUserId);
            throw new ForbiddenException("Yalnızca kendi randevunuzu iptal edebilirsiniz.");
        }

        // FR-R07: Tamamlanmış randevu iptal edilemez
        if (appointment.Status == AppointmentStatus.Completed)
        {
            _logger.LogWarning("Tamamlanmış randevu iptal edilemez: AppointmentId={AppointmentId}", id);
            throw new BusinessException("Tamamlanmış bir randevu iptal edilemez.");
        }

        if (appointment.Status == AppointmentStatus.Cancelled)
        {
            _logger.LogWarning("Zaten iptal edilmiş randevu tekrar iptal edilemez: AppointmentId={AppointmentId}", id);
            throw new BusinessException("Bu randevu zaten iptal edilmiştir.");
        }

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
                ChangedDate = _dateTimeProvider.TurkeyNow,
                Details = "Randevu iptal edildi."
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Randevu başarıyla iptal edildi: AppointmentId={AppointmentId}, İptalEdenUserId={UserId}", id, requestingUserId);

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
        {
            _logger.LogWarning("İptal edilmiş randevu tamamlanamaz: AppointmentId={AppointmentId}", id);
            throw new BusinessException("İptal edilmiş bir randevu tamamlanamaz.");
        }

        if (appointment.Status == AppointmentStatus.Completed)
        {
            _logger.LogWarning("Zaten tamamlanmış randevu tekrar tamamlanamaz: AppointmentId={AppointmentId}", id);
            throw new BusinessException("Bu randevu zaten tamamlanmış.");
        }

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
                ChangedDate = _dateTimeProvider.TurkeyNow,
                Details = "Randevu tamamlandı olarak işaretlendi."
            };
            await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Randevu başarıyla tamamlandı: AppointmentId={AppointmentId}", id);
    }

    public async Task<IReadOnlyList<AvailableSlotDto>> GetAvailableSlotsAsync(AvailableSlotsQueryDto query, CancellationToken cancellationToken = default)
    {
        var targetServiceIds = query.ServiceIds != null && query.ServiceIds.Any(id => id > 0)
            ? query.ServiceIds.Where(id => id > 0).Distinct().ToList()
            : new List<int> { query.ServiceId };

        int slotDuration;
        if (targetServiceIds.Count == 1)
        {
            var service = await _unitOfWork.Services.GetByIdAsync(targetServiceIds[0], cancellationToken)
                ?? throw new NotFoundException($"ID: {targetServiceIds[0]} olan hizmet bulunamadı.");
            slotDuration = service.DurationMinutes;
        }
        else
        {
            var services = await _unitOfWork.Services.GetByIdsAsync(targetServiceIds, cancellationToken);
            if (!services.Any())
                throw new NotFoundException("Seçilen hizmetler bulunamadı.");
            slotDuration = services.Sum(s => s.DurationMinutes);
        }

        if (slotDuration <= 0)
            slotDuration = 30;

        // Personeli doğrula
        var employee = await _unitOfWork.Employees.GetByIdAsync(query.EmployeeId, cancellationToken)
            ?? throw new NotFoundException($"ID: {query.EmployeeId} olan personel bulunamadı.");

        if (!employee.IsActive)
            throw new BusinessException($"'{employee.FullName}' personeli aktif değildir.");

        var targetDate = DateTime.SpecifyKind(query.Date.Date, DateTimeKind.Unspecified);

        // 1. Personel haftalık çalışma günü kontrolü (Çalışmadığı günlerde slot üretilmez)
        if (!employee.IsWorkingOn(targetDate.DayOfWeek))
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

        // O günkü onaylı personel izinlerini al
        IReadOnlyList<EmployeeLeaveRequest> approvedLeaves = Array.Empty<EmployeeLeaveRequest>();
        if (_unitOfWork.EmployeeLeaves != null)
        {
            var leavesFromDb = await _unitOfWork.EmployeeLeaves.GetApprovedLeavesInRangeAsync(
                query.EmployeeId, dayStart, dayEnd, cancellationToken);
            if (leavesFromDb != null)
            {
                approvedLeaves = leavesFromDb;
            }
        }

        var slots = new List<AvailableSlotDto>();
        var slotStep = (slotDuration > 0 && slotDuration < 30) ? slotDuration : 30;
        var cursor = dayStart;
        while (cursor.AddMinutes(slotDuration) <= dayEnd)
        {
            var slotEnd = cursor.AddMinutes(slotDuration);

            // 3. Geçmiş zamana ait slotlar listelenmemeli
            if (_dateTimeProvider.IsInPast(cursor))
            {
                cursor = cursor.AddMinutes(slotStep);
                continue;
            }

            // 4. Bu slot herhangi bir mevcut randevuyla veya onaylı izinle çakışıyor mu? (Dolu / izinli slotlar listelenmemeli)
            var isOccupied = existingAppointments.Any(a =>
                cursor < a.EndAt && slotEnd > a.StartAt) ||
                approvedLeaves.Any(l => cursor < l.EndDate && slotEnd > l.StartDate);

            if (!isOccupied)
            {
                slots.Add(new AvailableSlotDto
                {
                    StartAt = cursor,
                    EndAt = slotEnd,
                    DurationMinutes = slotDuration
                });
            }

            cursor = cursor.AddMinutes(slotStep);
        }

        return slots;
    }

    // ─── Yardımcı metotlar ───────────────────────────────────────────────────

    private static void ValidateServicesConflict(IReadOnlyList<Service> services)
    {
        if (services == null || services.Count <= 1)
            return;

        foreach (var srv in services)
        {
            if (srv.IsComposite && srv.SubServiceItems != null && srv.SubServiceItems.Any())
            {
                var subServiceIds = srv.SubServiceItems.Select(csi => csi.SubServiceId).ToHashSet();

                foreach (var other in services)
                {
                    if (other.Id == srv.Id)
                        continue;

                    // 1. Kural: Kompozit paket seçiliyken içeriğindeki alt hizmet seçilemez
                    if (subServiceIds.Contains(other.Id))
                    {
                        throw new BusinessException(
                            $"'{srv.Name}' paketi seçiliyken, bu paketin içeriğinde zaten yer alan '{other.Name}' hizmeti ayrıca seçilemez.");
                    }

                    // 2. Kural: İki kompozit paket aynı alt hizmeti içeremez
                    if (other.IsComposite && other.SubServiceItems != null)
                    {
                        var commonSub = other.SubServiceItems.FirstOrDefault(csi => subServiceIds.Contains(csi.SubServiceId));
                        if (commonSub != null)
                        {
                            var subName = commonSub.SubService?.Name ?? $"ID: {commonSub.SubServiceId}";
                            throw new BusinessException(
                                $"'{srv.Name}' ve '{other.Name}' paketlerinin her ikisi de '{subName}' hizmetini içermektedir. Lütfen çakışan paketleri aynı anda seçmeyiniz.");
                        }
                    }
                }
            }
        }
    }

    private static AppointmentDto MapToDto(Appointment a)
    {
        var servicesList = a.AppointmentServices != null && a.AppointmentServices.Any()
            ? a.AppointmentServices.Select(asi => new AppointmentServiceItemDto
            {
                ServiceId = asi.ServiceId,
                ServiceName = asi.Service?.Name ?? (asi.ServiceId == a.ServiceId ? a.Service?.Name ?? string.Empty : string.Empty),
                Price = asi.Price,
                DurationMinutes = asi.DurationMinutes
            }).ToList()
            : (a.Service != null
                ? new List<AppointmentServiceItemDto>
                {
                    new()
                    {
                        ServiceId = a.ServiceId,
                        ServiceName = a.Service.Name,
                        Price = a.Service.Price,
                        DurationMinutes = a.Service.DurationMinutes
                    }
                }
                : new List<AppointmentServiceItemDto>());

        var totalPrice = servicesList.Any() ? servicesList.Sum(s => s.Price) : (a.Service?.Price ?? 0);
        var totalDuration = (int)(a.EndAt - a.StartAt).TotalMinutes;
        if (totalDuration <= 0)
        {
            totalDuration = servicesList.Any() ? servicesList.Sum(s => s.DurationMinutes) : (a.Service?.DurationMinutes ?? 0);
        }

        var serviceName = servicesList.Any()
            ? string.Join(" + ", servicesList.Select(s => s.ServiceName))
            : (a.Service?.Name ?? string.Empty);

        return new AppointmentDto
        {
            Id = a.Id,
            UserId = a.UserId,
            CustomerName = a.User?.FullName ?? string.Empty,
            CustomerPhone = a.User?.Phone ?? string.Empty,
            EmployeeId = a.EmployeeId,
            EmployeeName = a.Employee?.FullName ?? string.Empty,
            ServiceId = a.ServiceId,
            ServiceName = serviceName,
            Price = totalPrice,
            DurationMinutes = totalDuration,
            StartAt = a.StartAt,
            EndAt = a.EndAt,
            Status = a.Status,
            Notes = a.Notes,
            CreatedAt = a.CreatedAt,
            Services = servicesList
        };
    }
}
