using BarberAppointment.Core.Enums;
using BarberAppointment.Data.Context;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.Security;
using Microsoft.EntityFrameworkCore;

namespace BarberAppointment.WebApi.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        try
        {
            if (!await context.Database.CanConnectAsync())
            {
                logger.LogWarning("Veritabanına bağlanılamadı. Seed işlemi atlandı.");
                return;
            }

            // Şema doğrulaması (Appointments.IsActive ve Users.IsPhoneVerified kontrolü)
            try
            {
                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Appointments', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Appointments') AND name = 'IsActive') BEGIN ALTER TABLE dbo.Appointments ADD IsActive BIT NOT NULL CONSTRAINT DF_Appointments_IsActive DEFAULT (1); END");

                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsPhoneVerified') BEGIN ALTER TABLE dbo.Users ADD IsPhoneVerified BIT NOT NULL CONSTRAINT DF_Users_IsPhoneVerified DEFAULT (0); END");

                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsEmailVerified') BEGIN ALTER TABLE dbo.Users ADD IsEmailVerified BIT NOT NULL CONSTRAINT DF_Users_IsEmailVerified DEFAULT (0); END");

                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'EmailVerificationToken') BEGIN ALTER TABLE dbo.Users ADD EmailVerificationToken NVARCHAR(128) NULL; END");

                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'EmailVerificationExpiresAt') BEGIN ALTER TABLE dbo.Users ADD EmailVerificationExpiresAt DATETIME2 NULL; END");

                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'PasswordResetToken') BEGIN ALTER TABLE dbo.Users ADD PasswordResetToken NVARCHAR(128) NULL; END");

                await context.Database.ExecuteSqlRawAsync(
                    "IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'PasswordResetExpiresAt') BEGIN ALTER TABLE dbo.Users ADD PasswordResetExpiresAt DATETIME2 NULL; END");
            }
            catch (Exception ex)
            {
                logger.LogWarning("Şema kontrolü sırasında uyarı: {Message}", ex.Message);
            }

            // 1. Demo Kullanıcıları Kontrol Et ve Oluştur / Güncelle
            var demoUsers = new List<(string FullName, string Email, string? Phone, UserRole Role, string Password)>
            {
                ("Sistem Yöneticisi", "superadmin@example.com", "5550000000", UserRole.Admin, "AdminPassword123!"),
                ("Ali Usta", "ali@example.com", "5552223344", UserRole.Employee, "Password123!"),
                ("Burak Yılmaz", "burak@example.com", "5553334455", UserRole.Customer, "Password123!"),
                ("Ayşe Demir", "ayse@example.com", "5551112233", UserRole.Customer, "Password123!"),
                ("Yönetici Kaya", "admin@example.com", "5550000001", UserRole.Admin, "AdminPassword123!")
            };

            foreach (var item in demoUsers)
            {
                var normalizedEmail = item.Email.Trim().ToLowerInvariant();
                var user = await context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
                passwordHasher.CreatePasswordHash(item.Password, out var hash, out var salt);

                if (user == null)
                {
                    user = new User
                    {
                        FullName = item.FullName,
                        Email = normalizedEmail,
                        Phone = item.Phone,
                        Role = item.Role,
                        PasswordHash = hash,
                        PasswordSalt = salt,
                        IsActive = true,
                        IsEmailVerified = true,
                        IsPhoneVerified = true
                    };
                    await context.Users.AddAsync(user);
                    logger.LogInformation("Demo kullanıcı oluşturuldu: {Email} ({Role})", normalizedEmail, item.Role);
                }
                else
                {
                    // Eğer kullanıcının şifre hash'i geçersizse veya 0x00 ile oluşturulmuşsa düzelt
                    bool needsUpdate = false;
                    if (!user.IsEmailVerified)
                    {
                        user.IsEmailVerified = true;
                        needsUpdate = true;
                    }
                    if (user.PasswordHash == null || user.PasswordHash.Length != 64 ||
                        user.PasswordSalt == null || user.PasswordSalt.Length != 128 ||
                        !passwordHasher.VerifyPasswordHash(item.Password, user.PasswordHash, user.PasswordSalt))
                    {
                        user.PasswordHash = hash;
                        user.PasswordSalt = salt;
                        needsUpdate = true;
                    }

                    if (!user.IsActive)
                    {
                        user.IsActive = true;
                        needsUpdate = true;
                    }

                    if (needsUpdate)
                    {
                        logger.LogInformation("Demo kullanıcı şifre/durum güncellendi: {Email}", normalizedEmail);
                    }
                }
            }

            await context.SaveChangesAsync();

            // 2. Personel (Employee) Kayıtlarını Doğrula ve Bağla
            var aliUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "ali@example.com");
            if (aliUser != null)
            {
                var aliEmp = await context.Employees.FirstOrDefaultAsync(e => e.UserId == aliUser.Id);
                if (aliEmp == null)
                {
                    aliEmp = await context.Employees.FirstOrDefaultAsync(e => e.FullName == "Ali Usta");
                    if (aliEmp != null)
                    {
                        aliEmp.UserId = aliUser.Id;
                    }
                    else
                    {
                        aliEmp = new Employee
                        {
                            UserId = aliUser.Id,
                            FullName = "Ali Usta",
                            Title = "Usta Berber",
                            IsActive = true
                        };
                        await context.Employees.AddAsync(aliEmp);
                    }
                }
            }

            if (!await context.Employees.AnyAsync(e => e.FullName == "Mehmet Usta"))
            {
                await context.Employees.AddAsync(new Employee
                {
                    FullName = "Mehmet Usta",
                    Title = "Saç Tasarım Uzmanı",
                    IsActive = true
                });
            }

            await context.SaveChangesAsync();

            // 3. Hizmetleri (Services) Doğrula
            var defaultServices = new List<(string Name, int DurationMinutes, decimal Price)>
            {
                ("Saç kesimi", 30, 250.00m),
                ("Sakal tıraşı", 20, 150.00m),
                ("Saç + sakal", 45, 350.00m),
                ("Cilt Bakımı", 30, 200.00m),
                ("Saç Boyama", 60, 500.00m)
            };

            foreach (var svc in defaultServices)
            {
                var exists = await context.Services.AnyAsync(s => s.Name.ToLower() == svc.Name.ToLower());
                if (!exists)
                {
                    await context.Services.AddAsync(new Service
                    {
                        Name = svc.Name,
                        DurationMinutes = svc.DurationMinutes,
                        Price = svc.Price,
                        IsActive = true
                    });
                }
            }

            await context.SaveChangesAsync();

            // 4. Personel - Hizmet İlişkilerini Doğrula
            var allEmployees = await context.Employees.ToListAsync();
            var allServices = await context.Services.ToListAsync();

            foreach (var emp in allEmployees)
            {
                foreach (var s in allServices)
                {
                    var hasLink = await context.EmployeeServices.AnyAsync(es => es.EmployeeId == emp.Id && es.ServiceId == s.Id);
                    if (!hasLink)
                    {
                        await context.EmployeeServices.AddAsync(new EmployeeService
                        {
                            EmployeeId = emp.Id,
                            ServiceId = s.Id
                        });
                    }
                }
            }

            await context.SaveChangesAsync();
            logger.LogInformation("Veritabanı seed ve başlangıç verisi kontrolü başarıyla tamamlandı.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Veritabanı seed işlemi sırasında bir hata oluştu: {Message}", ex.Message);
        }
    }
}
