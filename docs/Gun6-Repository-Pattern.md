# BarberAppointment — Gün 6: Repository Pattern

**Kapsam:** Repository Pattern, Interface, Dependency Injection (DI), Dependency Inversion Principle (DIP); Appointment, Employee, Service ve User repository arayüzleri ve implementasyonları; Unit of Work deseni; Scoped DI servis kayıtları ve canlı test doğrulaması.

---

## 1. Araştırılacak Temel Konular

### 1.1 Repository Pattern (Depo Deseni) Nedir?
- **Tanım:** Veritabanı veri erişim mantığını (EF Core, SQL sorguları) iş mantığından (`Services`) ve sunum katmanından (`WebApi`) soyutlayan bir tasarım desenidir.
- **Amacı:** Veri erişim işlemlerini bellek içi bir koleksiyon (koleksiyon yönetimi) gibi sunarak üst katmanların veritabanı teknolojisine doğrudan bağımlı olmasını engellemek.
- **Faydaları:**
  - **Tekrarın Önlenmesi (DRY):** Karmaşık sorgular (örneğin randevu çakışma kontrolü veya ilişkili veri yükleme) tek bir yerde tanımlanır ve yeniden kullanılır.
  - **Merkezi Bakım:** Veritabanı sorgularında yapılacak bir optimizasyon veya değişiklik yalnızca ilgili repository sınıfında yapılır.
  - **Birim Test Kolaylığı:** Controller veya servis testlerinde veritabanına bağlanmak yerine repository arayüzü taklit (Mock) edilebilir.

### 1.2 Interface (Arayüz) ve Sözleşme Tabanlı Geliştirme
- **Tanım:** Bir sınıfın hangi metot ve özellikleri sağlaması gerektiğini belirten kurallar bütünüdür (sözleşmedir).
- **Rolü:** Çağıran taraf somut sınıfa (`AppointmentRepository`) değil, arayüze (`IAppointmentRepository`) güvenir. Böylece somut sınıfın içi değişse veya değiştirilse bile çağıran kod kırılmaz.

### 1.3 Dependency Injection (DI) ve Yaşam Döngüleri
- **Tanım:** Bir sınıfın ihtiyaç duyduğu bağımlılıkları (örneğin repository veya DbContext nesneleri) kendi içinde `new`lemek yerine, dışarıdan (IoC Container) enjekte edilmesidir.
- **ASP.NET Core Yaşam Döngüleri (Lifetimes):**
  - **`Transient`:** Her enjeksiyon istendiğinde yeni bir örnek oluşturulur (Hafif ve durumsuz nesneler için).
  - **`Scoped`:** Her bir HTTP isteği (Request) başına tek bir örnek oluşturulur ve istek boyunca aynı nesne kullanılır (DbContext ve Repository'ler için standart seçim).
  - **`Singleton`:** Uygulama ayağa kalktığında tek bir örnek oluşturulur ve tüm uygulama ömrü boyunca o örnek paylaşılır (Önbellek, konfigürasyon servisleri için).

### 1.4 Dependency Inversion Principle (DIP)
- **SOLID'in D Harfi:**
  1. Yüksek seviyeli modüller (örneğin Controller veya Service), düşük seviyeli modüllere (örneğin EF Core DbContext) bağımlı olmamalıdır. Her ikisi de soyutlamalara (`interface`) bağımlı olmalıdır.
  2. Soyutlamalar detaylara bağımlı olmamalıdır; detaylar soyutlamalara bağımlı olmalıdır.
- **Projedeki Uygulama:** `AppointmentsController` doğrudan `AppDbContext`'e değil, `IUnitOfWork` ve `IAppointmentRepository` arayüzüne bağımlıdır.

---

## 2. Projede Uygulanan Repository Mimarisi

```
src/libraries/BarberAppointment.Data/
├── Context/
│   └── AppDbContext.cs
├── Configurations/
│   ├── AppointmentConfiguration.cs
│   ├── EmployeeConfiguration.cs
│   ├── EmployeeServiceConfiguration.cs
│   ├── ServiceConfiguration.cs
│   └── UserConfiguration.cs
├── Repositories/
│   ├── Interfaces/
│   │   ├── IRepository.cs              # Generic CRUD sözleşmesi
│   │   ├── IAppointmentRepository.cs   # Çakışma kontrolü & detaylı sorgular
│   │   ├── IEmployeeRepository.cs      # Hizmetleriyle usta sorguları
│   │   ├── IServiceRepository.cs       # Aktif hizmetler
│   │   ├── IUserRepository.cs          # E-posta ile kullanıcı sorgulama
│   │   └── IUnitOfWork.cs              # Transaction ve toplu commit yönetimi
│   └── Implementations/
│       ├── Repository.cs               # Generic EF Core CRUD tabanı
│       ├── AppointmentRepository.cs    # HasConflictAsync, GetAppointmentsWithDetailsAsync
│       ├── EmployeeRepository.cs       # GetEmployeesWithServicesAsync
│       ├── ServiceRepository.cs        # GetActiveServicesAsync
│       ├── UserRepository.cs           # GetByEmailAsync
│       └── UnitOfWork.cs               # Tüm repoları ve SaveChanges'ı koordine eder
└── Extensions/
    └── DataServiceRegistration.cs      # Scoped DI servis kayıtları
```

---

## 3. Öne Çıkan Repository Yetenekleri

### 3.1 Randevu Çakışma Kontrolü (`HasConflictAsync`)
Aynı personelin örtüşen saatlerde ikinci bir randevuya sahip olmasını engelleyen iş kuralı (Day 1 FR-R03):

```csharp
public async Task<bool> HasConflictAsync(int employeeId, DateTime startAt, DateTime endAt, int? excludeAppointmentId = null, CancellationToken cancellationToken = default)
{
    var query = DbSet
        .Where(a => a.EmployeeId == employeeId &&
                    a.Status != AppointmentStatus.Cancelled &&
                    a.IsActive &&
                    startAt < a.EndAt &&
                    endAt > a.StartAt);

    if (excludeAppointmentId.HasValue)
        query = query.Where(a => a.Id != excludeAppointmentId.Value);

    return await query.AnyAsync(cancellationToken);
}
```

### 3.2 Unit of Work Deseni
Birden fazla repository üzerinde yapılan değişiklikleri tek bir transaction altında güvenle commit eder:

```csharp
public class UnitOfWork : IUnitOfWork
{
    public IAppointmentRepository Appointments => _appointments ??= new AppointmentRepository(_context);
    public IEmployeeRepository Employees => _employees ??= new EmployeeRepository(_context);
    public IServiceRepository Services => _services ??= new ServiceRepository(_context);
    public IUserRepository Users => _users ??= new UserRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => await _context.SaveChangesAsync(cancellationToken);
}
```

---

## 4. Canlı Test ve Doğrulama Sonuçları

1. **Repository Üzerinden Listeleme (`GET /api/appointments`):**  
   Repository'nin `GetAppointmentsWithDetailsAsync` metodu üzerinden tüm ilişkili veriler (müşteri adı, personel adı, hizmet adı ve fiyatı) başarıyla döndü.
2. **Çakışma Kontrolü Testi (`POST /api/appointments`):**  
   Mevcut `11:00 - 11:30` randevusu olan Ali Usta için `11:15` saatine yeni kayıt açılmak istendiğinde `HasConflictAsync` çakışmayı tespit etti ve `409 Conflict` hatası döndü:
   ```json
   {
     "success": false,
     "message": null,
     "data": null,
     "errors": [
       "Seçilen personelin bu saat aralığında başka bir randevusu bulunmaktadır."
     ]
   }
   ```
