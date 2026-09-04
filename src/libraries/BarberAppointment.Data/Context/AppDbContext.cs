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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all IEntityTypeConfiguration classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
