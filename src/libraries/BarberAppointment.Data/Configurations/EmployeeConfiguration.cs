using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.FullName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Title)
            .HasMaxLength(100)
            .IsRequired(false);

        builder.Property(e => e.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(e => e.CreatedAt)
            .HasPrecision(0)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(e => e.UserId)
            .IsUnique()
            .HasFilter("[UserId] IS NOT NULL");

        builder.HasOne(e => e.User)
            .WithOne(u => u.Employee)
            .HasForeignKey<Employee>(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
