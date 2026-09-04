# BarberAppointment — Gün 5: Entity Framework Core

**Kapsam:** ORM, EF Core, DbContext, DbSet, Migration, Code First, LINQ, async/await; Entity konfigürasyonları, `AppDbContext`, Migration alınması ve MSSQL veritabanı bağlantısının çalıştırılması.

---

## 1. Araştırılacak Temel Konular

### 1.1 ORM (Object-Relational Mapping) Nedir?
- **Tanım:** Nesne yönelimli programlama dillerindeki nesneler (C# sınıfları) ile ilişkisel veritabanı tabloları (MSSQL) arasında köprü kurarak veri dönüşümünü otomatik yapan yazılım tekniğidir.
- **Çözdüğü Problem (*Object-Relational Impedance Mismatch*):** İlişkisel veritabanları tablolar, satırlar ve yabancı anahtarlarla (FK) çalışırken; nesne yönelimli diller sınıflar, nesneler ve referanslarla (Navigation Properties) çalışır. ORM bu iki dünya arasındaki dönüşümü şeffaf hale getirir.
- **Avantajları:**
  - SQL enjeksiyonuna (SQL Injection) karşı varsayılan parametreli sorgularla koruma sağlar.
  - CRUD işlemlerinde standartlaşma ve tip güvenliği (Type Safety) sunar.
  - Veritabanı sağlayıcıları (MSSQL, PostgreSQL, SQLite) arasında geçişi kolaylaştırır.

### 1.2 Entity Framework Core (EF Core) Nedir?
- **Tanım:** Microsoft'un .NET için geliştirdiği modern, açık kaynaklı, yüksek performanslı ve hafif bir ORM kütüphanesidir.
- **Katmanlı Mimarideki Yeri:** `BarberAppointment.Data` katmanında konumlanır; veritabanı işlemlerini iş katmanından (`Services`) ve API katmanından (`WebApi`) soyutlar.

### 1.3 DbContext ve DbSet<T> Nedir?
- **DbContext:** Veritabanıyla olan bağlantı oturumunu (session) temsil eder. İki kritik tasarım desenini içinde barındırır:
  1. **Unit of Work:** Değişiklikleri tek bir transaction altında topluca kaydeder (`SaveChangesAsync()`).
  2. **Repository:** Her `DbSet<T>` tablosu üzerinden veri okuma/yazma sağlar.
  3. **Change Tracker:** Belleğe yüklenen entity'lerin durumlarını (`Added`, `Modified`, `Deleted`, `Unchanged`) izler.
- **DbSet<T>:** Belirli bir varlık (`User`, `Appointment` vb.) için veritabanı tablosunu temsil eden ve üzerinde LINQ sorguları çalıştırılabilen koleksiyondur.

### 1.4 Code First Yaklaşımı ve Migration Mekanizması
- **Code First:** Veritabanı tablolarını SQL script'i yazmak yerine doğrudan C# sınıfları (`Domain/Entities`) ve Fluent API konfigürasyonları (`Data/Configurations`) ile tanımlama yaklaşımıdır.
- **Migration (Göç):** Model sınıflarında yapılan değişikliklerin (yeni kolon, tip değişimi, yeni tablo) adım adım versiyonlanarak veritabanı şemasına yansıtılmasını sağlar.
- **`__EFMigrationsHistory` Tablosu:** Veritabanında hangi migration'ların çalıştırıldığını takip eden özel sistem tablosudur.
- **Kritik CLI Komutları:**
  ```bash
  # Yeni migration oluşturma
  dotnet ef migrations add InitialCreate --project src/libraries/BarberAppointment.Data --startup-project src/presentation/BarberAppointment.WebApi

  # Veritabanına uygulama
  dotnet ef database update --project src/libraries/BarberAppointment.Data --startup-project src/presentation/BarberAppointment.WebApi
  ```

### 1.5 LINQ (Language Integrated Query)
- **Tanım:** C# dilinin içine entegre edilmiş, derleme zamanında tip kontrolü sağlayan sorgulama sözdizimidir.
- **EF Core ile Eşleşmesi:** Yazılan LINQ sorguları EF Core tarafından çalışma zamanında optimize edilmiş SQL ifadelerine dönüştürülür.
- **Sık Kullanılan Metotlar:**
  - `Where(...)` -> SQL `WHERE`
  - `Select(...)` -> SQL `SELECT` (Projeksiyon / DTO dönüşümü)
  - `Include(...)` / `ThenInclude(...)` -> SQL `JOIN` (Eager Loading)
  - `AsNoTracking()` -> Salt okunur sorgularda Change Tracker yükünü kaldırarak yüksek performans sağlar.

### 1.6 Asenkron Programlama (`async` / `await`)
- **Neden Önemli?** Veritabanı sorguları I/O-bound (girdi/çıktı) işlemlerdir. Senkron bir veritabanı çağrısı thread'i kilitler (blocking). `async/await` sayesinde thread bloke edilmez, sunucu kaynakları verimli kullanılır ve yüksek eşzamanlı istekler başarıyla karşılanır.
- **Asenkron Metotlar:**
  - `ToListAsync(cancellationToken)`
  - `FirstOrDefaultAsync(cancellationToken)`
  - `AddAsync(entity, cancellationToken)`
  - `SaveChangesAsync(cancellationToken)`

---

## 2. Projede Uygulanan EF Core Yapılandırması

### 2.1 Fluent API Konfigürasyonları (`src/libraries/BarberAppointment.Data/Configurations/`)
- `UserConfiguration.cs`: Tablo adı `Users`, tekil `Email` index'i, `Role` TINYINT enum dönüşümü, `CreatedAt` UTC varsayılan değeri.
- `EmployeeConfiguration.cs`: `Employees` tablosu, `UserId` için filtrelenmiş tekil indeks (`WHERE [UserId] IS NOT NULL`), 1-1 `User` ilişkisi (`OnDelete(Restrict)`).
- `ServiceConfiguration.cs`: `Services` tablosu, `Price` decimal(10,2) hassasiyeti, `DurationMinutes` alanı.
- `EmployeeServiceConfiguration.cs`: `EmployeeServices` ara tablosu, bileşik anahtar `(EmployeeId, ServiceId)`, N-N ilişkiler.
- `AppointmentConfiguration.cs`: `Appointments` tablosu, `(EmployeeId, StartAt)` ve `(UserId, StartAt)` index'leri, `Status` TINYINT enum dönüşümü, ilişkiler.

### 2.2 AppDbContext (`src/libraries/BarberAppointment.Data/Context/AppDbContext.cs`)
```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public virtual DbSet<User> Users => Set<User>();
    public virtual DbSet<Employee> Employees => Set<Employee>();
    public virtual DbSet<Service> Services => Set<Service>();
    public virtual DbSet<EmployeeService> EmployeeServices => Set<EmployeeService>();
    public virtual DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

### 2.3 Dependency Injection ve Bağlantı Dizesi (`WebApi`)
- **`appsettings.json`:**
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=BarberAppointment;User Id=sa;Password=BarberApp_Dev1!;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
  ```
- **`Program.cs`:**
  ```csharp
  builder.Services.AddDbContext<AppDbContext>(options =>
      options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
  ```

---

## 3. Doğrulama ve Çalışma Testleri

1. **Migration Alındı:** `20260825063034_InitialCreate` oluşturuldu.
2. **Veritabanına Uygulandı:** `dotnet ef database update` ile MSSQL üzerinde tüm şema, index'ler ve `__EFMigrationsHistory` tablosu oluşturuldu.
3. **Canlı API ve EF Core Sorgu Doğrulaması:**
   - `GET /api/appointments`: LINQ `.Include(a => a.User).Include(a => a.Employee).Include(a => a.Service)` ile SQL JOIN sorgusu çalıştı ve `200 OK` döndü.
   - `POST /api/appointments`: EF Core `AddAsync` + `SaveChangesAsync` ile yeni randevu kaydı oluşturuldu (`201 Created`).
