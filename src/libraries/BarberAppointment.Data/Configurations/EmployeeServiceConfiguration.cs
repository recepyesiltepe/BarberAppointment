using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class EmployeeServiceConfiguration : IEntityTypeConfiguration<EmployeeService>
{
    public void Configure(EntityTypeBuilder<EmployeeService> builder)
    {
        builder.ToTable("EmployeeServices");

        builder.HasKey(es => new { es.EmployeeId, es.ServiceId });

        builder.HasOne(es => es.Employee)
            .WithMany(e => e.EmployeeServices)
            .HasForeignKey(es => es.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(es => es.Service)
            .WithMany(s => s.EmployeeServices)
            .HasForeignKey(es => es.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(es => es.ServiceId)
            .HasDatabaseName("IX_EmployeeServices_ServiceId");
    }
}
