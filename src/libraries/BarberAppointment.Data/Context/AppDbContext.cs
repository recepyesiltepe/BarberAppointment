using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.Data.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public virtual DbSet<User> Users => Set<User>();
    public virtual DbSet<Employee> Employees => Set<Employee>();
    public virtual DbSet<Service> Services => Set<Service>();
    public virtual DbSet<EmployeeService> EmployeeServices => Set<EmployeeService>();
    public virtual DbSet<Appointment> Appointments => Set<Appointment>();
    public virtual DbSet<AppointmentAuditLog> AppointmentAuditLogs => Set<AppointmentAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all IEntityTypeConfiguration classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    public override int SaveChanges()
    {
        EnforceAuditLogImmutability();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnforceAuditLogImmutability();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnforceAuditLogImmutability();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        EnforceAuditLogImmutability();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void EnforceAuditLogImmutability()
    {
        var invalidAuditEntries = ChangeTracker.Entries<AppointmentAuditLog>()
            .Where(e => e.State == EntityState.Modified || e.State == EntityState.Deleted);

        if (invalidAuditEntries.Any())
        {
            throw new InvalidOperationException("Audit log kayıtları değiştirilemez veya silinemez (append-only).");
        }
    }
}
