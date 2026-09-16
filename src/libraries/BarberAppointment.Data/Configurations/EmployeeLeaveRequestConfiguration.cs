using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class EmployeeLeaveRequestConfiguration : IEntityTypeConfiguration<EmployeeLeaveRequest>
{
    public void Configure(EntityTypeBuilder<EmployeeLeaveRequest> builder)
    {
        builder.ToTable("EmployeeLeaveRequests");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.StartDate)
            .IsRequired()
            .HasPrecision(0);

        builder.Property(x => x.EndDate)
            .IsRequired()
            .HasPrecision(0);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<byte>();

        builder.Property(x => x.Reason)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(x => x.AdminNote)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(x => x.ReviewedAt)
            .IsRequired(false);

        builder.Property(x => x.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.HasOne(x => x.Employee)
            .WithMany(e => e.LeaveRequests)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ReviewedByUser)
            .WithMany()
            .HasForeignKey(x => x.ReviewedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.EmployeeId, x.Status });
        builder.HasIndex(x => new { x.StartDate, x.EndDate });
    }
}

