using BarberAppointment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberAppointment.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.FullName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.Phone)
            .HasMaxLength(20)
            .IsRequired(false);

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(u => u.PasswordSalt)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(u => u.Role)
            .IsRequired()
            .HasConversion<byte>();

        builder.Property(u => u.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(u => u.IsPhoneVerified)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(u => u.IsEmailVerified)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(u => u.EmailVerificationToken)
            .HasMaxLength(128)
            .IsRequired(false);

        builder.Property(u => u.EmailVerificationExpiresAt)
            .IsRequired(false);

        builder.Property(u => u.PasswordResetToken)
            .HasMaxLength(128)
            .IsRequired(false);

        builder.Property(u => u.PasswordResetExpiresAt)
            .IsRequired(false);

        builder.Property(u => u.CreatedAt)
            .HasPrecision(0)
            .HasDefaultValueSql("SYSUTCDATETIME()");
    }
}
