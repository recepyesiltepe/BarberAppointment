using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("Appointments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.StartAt)
            .IsRequired()
            .HasPrecision(0);

        builder.Property(a => a.EndAt)
            .IsRequired()
            .HasPrecision(0);

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<byte>();

        builder.Property(a => a.Notes)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(a => a.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(a => a.CreatedAt)
            .HasPrecision(0)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(a => a.User)
            .WithMany(u => u.Appointments)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Employee)
            .WithMany(e => e.Appointments)
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Service)
            .WithMany(s => s.Appointments)
            .HasForeignKey(a => a.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => new { a.EmployeeId, a.StartAt })
            .HasDatabaseName("IX_Appointments_Employee_Start");

        builder.HasIndex(a => new { a.UserId, a.StartAt })
            .HasDatabaseName("IX_Appointments_User_Start");
    }
}
