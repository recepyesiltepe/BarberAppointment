using BarberAppointment.Core.Enums;
using BarberAppointment.Domain.Entities;

namespace BarberAppointment.Data.Repositories.Interfaces;

public interface IAppointmentRepository : IRepository<Appointment>
{
    Task<IReadOnlyList<Appointment>> GetAppointmentsWithDetailsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Appointment>> GetFilteredAsync(int? employeeId, int? userId, AppointmentStatus? status, DateTime? start, DateTime? end, CancellationToken cancellationToken = default);
    Task<Appointment?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Appointment>> GetByEmployeeAndDateRangeAsync(int employeeId, DateTime start, DateTime end, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Appointment>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);
    Task<bool> HasConflictAsync(int employeeId, DateTime startAt, DateTime endAt, int? excludeAppointmentId = null, CancellationToken cancellationToken = default);
}
