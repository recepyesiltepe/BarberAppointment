using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class AppointmentAuditLogConfiguration : IEntityTypeConfiguration<AppointmentAuditLog>
{
    public void Configure(EntityTypeBuilder<AppointmentAuditLog> builder)
    {
        builder.ToTable("AppointmentAuditLogs");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Action)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.OldStatus)
            .HasMaxLength(50);

        builder.Property(a => a.NewStatus)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.ChangedByRole)
            .HasMaxLength(50);

        builder.Property(a => a.ChangedByName)
            .HasMaxLength(100);

        builder.Property(a => a.ChangedDate)
            .IsRequired();

        builder.Property(a => a.Details)
            .HasMaxLength(500);

        builder.HasOne(a => a.Appointment)
            .WithMany()
            .HasForeignKey(a => a.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.ChangedByUser)
            .WithMany()
            .HasForeignKey(a => a.ChangedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.AppointmentId);
        builder.HasIndex(a => a.ChangedDate);
    }
}

