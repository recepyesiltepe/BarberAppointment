using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class AppointmentServiceItemConfiguration : IEntityTypeConfiguration<AppointmentServiceItem>
{
    public void Configure(EntityTypeBuilder<AppointmentServiceItem> builder)
    {
        builder.ToTable("AppointmentServiceItems");

        builder.HasKey(asi => asi.Id);

        builder.Property(asi => asi.Price)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(asi => asi.DurationMinutes)
            .IsRequired();

        builder.Property(asi => asi.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(asi => asi.CreatedAt)
            .HasPrecision(0)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(asi => asi.Appointment)
            .WithMany(a => a.AppointmentServices)
            .HasForeignKey(asi => asi.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(asi => asi.Service)
            .WithMany()
            .HasForeignKey(asi => asi.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(asi => asi.AppointmentId);
        builder.HasIndex(asi => asi.ServiceId);
    }
}

