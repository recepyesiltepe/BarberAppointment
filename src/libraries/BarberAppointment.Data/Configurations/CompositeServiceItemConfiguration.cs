using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class CompositeServiceItemConfiguration : IEntityTypeConfiguration<CompositeServiceItem>
{
    public void Configure(EntityTypeBuilder<CompositeServiceItem> builder)
    {
        builder.ToTable("CompositeServiceItems");

        builder.HasKey(csi => csi.Id);

        builder.Property(csi => csi.Order)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(csi => csi.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(csi => csi.CreatedAt)
            .HasPrecision(0)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        // Composite (Parent) Service ilişkisi: Ana kompozit hizmet silinirse bağlantıları da silinsin
        builder.HasOne(csi => csi.CompositeService)
            .WithMany(s => s.SubServiceItems)
            .HasForeignKey(csi => csi.CompositeServiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // SubService (Child) ilişkisi: Bir alt hizmet pakete dahilken yanlışlıkla silinemesin (Restrict)
        builder.HasOne(csi => csi.SubService)
            .WithMany(s => s.ParentCompositeItems)
            .HasForeignKey(csi => csi.SubServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        // Bir paket içinde aynı alt hizmet iki defa yer alamaz
        builder.HasIndex(csi => new { csi.CompositeServiceId, csi.SubServiceId })
            .IsUnique();
    }
}

