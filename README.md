# BarberAppointment

ASP.NET Core REST API tabanlı kuaför randevu sistemi. Web ve mobil istemciler aynı API’yi kullanır.

## Gün 1 çıktısı

- [Gereksinim dokümanı](docs/Gun1-Gereksinim-Dokumani.md)
- [Temel use-case’ler](docs/Use-Cases.md)

## Gün 2 çıktısı

- [OOP ve SOLID araştırma notu](docs/Gun2-OOP-ve-SOLID.md)
- Örnek kod: `samples/BarberAppointment.SolidExamples`

```bash
dotnet run --project samples/BarberAppointment.SolidExamples
```

## Gün 3 çıktısı

- [Veritabanı tasarımı ve ER](docs/Gun3-Veritabani-Tasarimi.md)
- ER kaynak: [docs/er-diagram.mmd](docs/er-diagram.mmd)
- MSSQL: `database/mssql/` (`01_create_database.sql`, `02_schema.sql`, `03_seed.sql`, `04_sample_joins.sql`)
- Mac’te çalıştırma: [docs/Gun3-MSSQL-Yerel-Kurulum.md](docs/Gun3-MSSQL-Yerel-Kurulum.md) — `./database/mssql/up.sh`

## Gün 4 çıktısı

- [Katmanlı mimari ve .NET solution dokümanı](docs/Gun4-Dotnet-Solution-ve-Katmanli-Mimari.md)
- Solution: `BarberAppointment.sln`
- Projeler ve katmanlar:
  - `src/libraries/BarberAppointment.Core` (Classlib)
  - `src/libraries/BarberAppointment.Domain` (Classlib)
  - `src/libraries/BarberAppointment.Data` (Classlib)
  - `src/libraries/BarberAppointment.Services` (Classlib)
  - `src/presentation/BarberAppointment.WebApi` (Web API)

Derleme:

```bash
dotnet build
```

API'yi çalıştırma:

```bash
dotnet run --project src/presentation/BarberAppointment.WebApi
```

## Gün 5 çıktısı

- [Entity Framework Core araştırma ve mimari dokümanı](docs/Gun5-Entity-Framework-Core.md)
- `AppDbContext` ve Fluent API Konfigürasyonları: `src/libraries/BarberAppointment.Data`
- Migration: `20260825063034_InitialCreate`
- EF Core ile MSSQL veritabanı şeması ve canlı API testleri (LINQ & async/await)

Migration komutları:

```bash
# Yeni migration ekleme
dotnet ef migrations add <MigrationAdi> --project src/libraries/BarberAppointment.Data --startup-project src/presentation/BarberAppointment.WebApi

# Veritabanını güncelleme
dotnet ef database update --project src/libraries/BarberAppointment.Data --startup-project src/presentation/BarberAppointment.WebApi
```

## Gün 6 çıktısı

- [Repository Pattern, DI ve DIP araştırma dokümanı](docs/Gun6-Repository-Pattern.md)
- Generic ve Varlığa Özel Repository'ler:
  - `IRepository<T>` & `Repository<T>`
  - `IAppointmentRepository` & `AppointmentRepository` (Çakışma kontrolü `HasConflictAsync` & detaylı randevu sorguları)
  - `IEmployeeRepository` & `EmployeeRepository` (Uzmanlık/hizmetleriyle personel sorguları)
  - `IServiceRepository` & `ServiceRepository` (Aktif hizmetler)
  - `IUserRepository` & `UserRepository`
  - `IUnitOfWork` & `UnitOfWork` (Transaction & koordineli SaveChanges)
- `AddDataServices` ile Scoped DI servis kayıtları
- Controller katmanının `IUnitOfWork` arayüzü üzerinden DIP ve çakışma kuralı testleri

## Gün 7 çıktısı

- [Service ve Business Katmanı araştırma dokümanı](docs/Gun7-Service-ve-Business-Katmani.md)
- `Controller -> Service -> Repository -> Database` uçtan uca mimari akışı
- DTO'lar ve Entity/DTO izolasyonu (`AppointmentDto`, `EmployeeDto`, `ServiceDto`, `UserDto`)
- İş Kuralları Servisleri:
  - `IAppointmentService` & `AppointmentService` (Geçmiş tarih, aktiflik, uzmanlık yetkinliği, çakışma kontrolü, durum geçişleri)
  - `IEmployeeService` & `EmployeeService` (Personel CRUD & Hizmet atamaları)
  - `IServiceManagementService` & `ServiceManagementService` (Hizmet yönetimi)
  - `IUserService` & `UserService` (Tekil e-posta & müşteri yönetimi)
- `AddBusinessServices` ile Scoped DI kayıtları
- REST Controller'ları (`AppointmentsController`, `EmployeesController`, `ServicesController`, `UsersController`)

## Gün 8 çıktısı

- [CRUD API Endpointleri dokümanı](docs/Gun8-CRUD-API-Endpointleri.md)
- **Swagger UI:** `http://localhost:5184/swagger` (geliştirme ortamında)
- Services için tam CRUD: `GET /api/services`, `POST`, `PUT /{id}`, `DELETE /{id}`
- Employees için tam CRUD: `GET /api/employees`, `POST`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/services`
- Toplam **22 endpoint** Swagger üzerinden belgelendi ve test edildi
- XML dokümantasyon (`/// <summary>`) → Swagger UI'da açıklama olarak görünür

## Gün 9 çıktısı

- [Randevu Modülü & Business Rules Tasarımı dokümanı](docs/Gun9-Randevu-Modulu-Business-Rules.md)
- Randevu oluşturma, çok kriterli filtreleme, yeniden zamanlama (Reschedule) ve iptal/tamamlama döngüsü
- **İş Kuralları (Business Rules) Tam Uygulaması:**
  - Geçmiş tarih kontrolü (`BR-01`)
  - Çalışma saatleri sınırları (09:00–20:00) (`BR-02`)
  - Pasif personel / pasif hizmet / pasif müşteri engeli (`BR-03`, `BR-04`, `BR-05`)
  - Personel-hizmet yetkinlik doğrulaması (`BR-06`)
  - Bitiş saati otomatik hesaplama (`BR-07`)
  - Personel-saat çakışma formülü ve engelleme (`BR-08`, `409 Conflict`)
  - İptal edilen slotun serbest kalması (`BR-09`)
  - Durum geçiş sınırları (tamamlanmış/iptal edilmişin yeniden iptal edilememesi) (`BR-10`)
  - Boş slot hesaplama algoritması (`/api/appointments/available-slots`)
- Tüm senaryolar otomatik entegrasyon testleriyle doğrulandı

## Gün 10 çıktısı

- [Validation ve Global Exception Handling dokümanı](docs/Gun10-Validation-ve-Exception-Handling.md)
- **FluentValidation:** Tüm DTO'lar için bağımsız validator sınıfları (`CreateAppointmentValidator`, `CreateEmployeeValidator`, `CreateServiceValidator`, `CreateUserValidator` vb.)
- **Global Exception Middleware:** `GlobalExceptionMiddleware` ile tüm 400, 401, 404, 409 ve 500 hataları merkezi yakalanır
- **Standart Response Modeli:** `ApiResponse<T>` (success, statusCode, message, data, errors, timestamp)
- **Model Validation Entegrasyonu:** `ApiValidationResultFactory` ile geçersiz istekler doğrudan standart `ApiResponse` şemasında döner
- **Lean Controllers:** Controller'lardan `try-catch` blokları temizlendi, DRY sağlandı

## Gün 11 çıktısı

- [Authentication ve JWT dokümanı](docs/Gun11-Authentication-ve-JWT.md)
- **Güvenlik Mimarisi:**
  - `PasswordHasher` ile HMAC-SHA512 şifre tuzlama (salt) ve özetleme (hash)
  - `JwtTokenService` ile Stateless JWT Access Token üretimi ve Claims yönetimi
- **Rol Tabanlı Yetkilendirme (RBAC):** `Admin`, `Customer`, `Employee` rolleri
- **Auth Endpointleri:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/change-password`
- **Rol Yetki Koruması:** `[Authorize(Roles = ...)]` ile endpointler rol matrisine göre korundu (401 Unauthorized & 403 Forbidden kontrolleri)
- **Swagger UI JWT Desteği:** Swagger UI üzerinden "Authorize" butonu ile token testi aktif edildi

## Gün 12 çıktısı

- [SOLID Code Review ve Refactoring dokümanı](docs/Gun12-SOLID-Code-Review-ve-Refactoring.md)
- **SOLID Mimarisi İyileştirmeleri:**
  - **S (SRP):** Controller'lar yalnızca HTTP/routing sorumluluğuna indirgendi; hata yönetimi middleware'e, validasyon validator sınıflarına, güvenlik `PasswordHasher`/`JwtTokenService`'e devredildi
  - **O (OCP):** `IWorkHoursPolicy` ve `DefaultWorkHoursPolicy` ile çalışma saatleri politikası değiştirilmeye gerek kalmadan genişletilebilir hale getirildi
  - **L (LSP):** Repository'ler ve `BaseEntity` kalıtımı Liskov ikame kuralına tam uyumlu kılındı
  - **I (ISP):** Monolitik servis yerine `IAppointmentService`, `IEmployeeService`, `IServiceManagementService`, `IUserService`, `IAuthService`, `IDateTimeProvider` gibi dar kapsamlı arayüzler oluşturuldu
  - **D (DIP):** DbContext ve zaman bağımlılıkları (`IDateTimeProvider`, `IUnitOfWork`, `IRepository`) soyutlamalar arkasına alındı, IoC Container üzerinden yönetildi
- **SOLID Örnek Projesi:** `samples/BarberAppointment.SolidExamples` (5 prensibin canlı konsol gösterimi)

## Gün 13 çıktısı

- [Backend Test ve Tamamlama dokümanı](docs/Gun13-Backend-Test-ve-Tamamlama.md)
- **Web ve Mobile İçin Hazır Backend:**
  - CORS politikası (`AllowAll`) eklendi
  - Standart `ApiResponse<T>` şeması tüm istemciler için tutarlı hale getirildi
- **Postman Collection & Environment:**
  - [`postman/BarberAppointment.postman_collection.json`](postman/BarberAppointment.postman_collection.json) (Tüm endpointler + Test scriptleri)
  - [`postman/BarberAppointment.postman_environment.json`](postman/BarberAppointment.postman_environment.json) (Local Dev ortamı)
- **Otomatik Test Paketi:**
  - [`tests/test_all_scenarios.sh`](tests/test_all_scenarios.sh) ile 22 uçtan uca senaryo (Auth, CRUD, İş kuralları, 401, 403, 400, 404, 409) test edildi (%100 Başarı)

## Gün 14 çıktısı

- [React Web Başlangıç dokümanı](docs/Gun14-React-Web-Baslangic.md)
- **React 19 & Vite Web Uygulaması:**
  - Modern Altın/Amber Dark Theme Tasarım Sistemi (`index.css`)
  - `Axios` Interceptors ile otomatik `Bearer <token>` yönetimi ve 401 oturum yönetimi
  - `AuthProvider` & `useAuth` hook'u ile global auth state yönetimi
  - `LoginScreen`: Giriş ve Kayıt sekmeleri, Hızlı Test Giriş Butonları (👑 Admin, ✂️ Personel, 👤 Müşteri)
  - `DashboardScreen`: Kullanıcı karşılama, JWT Token & Claims İnceleme paneli, Canlı Hizmetler ve Personel kataloğu
  - `Navbar`: Marka logosu, Canlı API durumu, Rol rozeti (`Yönetici`, `Personel`, `Müşteri`), Çıkış butonu

## Gün 15 çıktısı

- [Web Yönetim Paneli dokümanı](docs/Gun15-Web-Yonetim-Paneli.md)
- **Web Yönetim Paneli (Admin & Staff Panel):**
  - **Dashboard:** KPI metrik kartları (Toplam Randevu, Ciro Analizi, Aktif Personel, Aktif Hizmetler) ve Son Randevular akışı
  - **Hizmetler (Services CRUD):** Hizmet listeleme, canlı arama, Ekleme/Düzenleme/Silme modalları ve süre/fiyat validasyonu
  - **Personeller (Employees CRUD):** Personel kadrosu yönetimi, Ekleme/Düzenleme ve Hizmet Yetkisi Atama (`Checklist`)
  - **Randevular (Appointments):** Çok kriterli filtreleme (Personele, Duruma göre), Tamamlama (`Complete`), İptal Etme (`Cancel`) ve Yeni Randevu Oluşturma modalı

## Gün 16 çıktısı

- [React Native / Expo Başlangıç dokümanı](docs/Gun16-React-Native-Expo-Baslangic.md)
- **React Native & Expo Mobil Uygulama:**
  - Modern Altın/Amber Dark Mobil Tasarım Sistemi (`colors.js`)
  - Platform duyarlı Axios istemcisi (iOS Simulator, Android Emülatör `10.0.2.2`, Fiziksel Cihaz LAN IP)
  - `AuthProvider` ile mobil oturum yönetimi ve `setClientToken` interceptor entegrasyonu
  - `LoginScreen`: Giriş ve Kayıt formları, 1-Tap Hızlı Test Girişleri (👑 Admin, ✂️ Personel, 👤 Müşteri), Dinamik Sunucu URL Yapılandırması
  - `HomeScreen`: Kullanıcı karşılama, Rol rozeti (`👑 Yönetici`, `✂️ Personel`, `👤 Müşteri`), Canlı API Durumu (🟢 Çevrimiçi), JWT Token & Claims İnceleme kartı, Çekerek Yenileme (`Pull-to-Refresh`), Canlı Hizmetler ve Personel listesi

## Gün 17 çıktısı

- [Mobil Randevu Akışı dokümanı](docs/Gun17-Mobil-Randevu-Akisi.md)
- **Mobil Randevu Sihirbazı (4-Step Wizard Flow):**
  - **1. Adım:** Hizmet Seçimi (Fiyat ve süre kartları)
  - **2. Adım:** Personel Seçimi (Hizmeti verebilen kuaförler)
  - **3. Adım:** 7 Günlük Tarih Seçici ve Backend Boş Slot Hesaplama Motoru (`/api/appointments/available-slots`)
  - **4. Adım:** Randevu Özeti, Özel Notlar ve Onay
  - **5. Adım (Başarı):** Bilet/Fiş görünümü ve Randevularım'a yönlendirme
- **Randevularım Ekranı (`MyAppointmentsScreen`):**
  - Geçmiş/aktif randevu listesi
  - Canlı Durum Rozetleri (`Onaylandı`, `Bekliyor`, `Tamamlandı`, `İptal Edildi`)
  - Çekerek Yenileme (`Pull-to-Refresh`) ve Randevu İptali (`cancelAppointment`)
- **Alt Navigasyon Menüsü (`BottomNav`):** Keşfet, Randevu Al, Randevularım

## Gün 18 çıktısı

- [Mobil Randevularım ve Profil Yönetimi dokümanı](docs/Gun18-Mobil-Randevularim.md)
- **Gelişmiş Mobil Randevu & Profil Yönetimi:**
  - **Segmented Filtreleme:** `Yaklaşan Randevular`, `Geçmiş Randevular` ve `Tümü` sekmeleri
  - **Loading, Error & Empty States:** Yüklenme animasyonu, `Yeniden Dene` hata aksiyonu ve `+ Randevu Al` boş durum kartı
  - **Kalan Süre Sayacı (`getRelativeTime`):** Randevu zamanına kalan süre dinamik hesaplanır (`⏳ 1 gün sonra`, `⏳ 3 saat sonra`)
  - **Güvenli İptal Eylemi:** Yalnızca aktif randevularda onay uyarısıyla `PUT /api/appointments/{id}/cancel` çağrısı
  - **Profil ve Ayarlar Ekranı (`ProfileScreen`):** Hesap detayları, JWT token inceleme, dinamik API sunucu IP değiştirici ve güvenli çıkış
  - **4 Sekmeli Alt Navigasyon Barı:** 🏠 Keşfet, ✂️ Randevu Al, 📅 Randevularım, 👤 Profilim

## Gün 19 çıktısı

- [Genel Test, Bug Fix, Git & Dokümantasyon](docs/Gun19-Genel-Test-BugFix-Git-README.md)
- [Proje Sunum Rehberi (Executive Presentation Guide)](docs/PROJE-SUNUM-REHBERI.md)
- **Sunuma Hazır Tam Yığın Doğrulama:**
  - **API E2E Testleri:** 22/22 uçtan uca senaryo başarıyla geçti (`tests/test_all_scenarios.sh`)
  - **SOLID Mimarisi:** 5 temel prensibin konsol uygulamasıyla doğrulanması (`samples/BarberAppointment.SolidExamples`)
  - **Web Yönetim Paneli:** React 19 + Vite 0 Hata ile derlendi (`dist/`)
  - **Mobil Uygulama:** React Native & Expo iOS ve Android paketleri 0 Hata ile dışa aktarıldı
  - **Git & Temizlik:** `.gitignore` yapılandırması ve temiz kod tabanı

## Gün 20 çıktısı

- [Proje Sunumu ve Kapsamlı Teknik Değerlendirme](docs/Gun20-Proje-Sunumu-ve-Teknik-Degerlendirme.md)
- [Proje Sunum Rehberi (Executive Presentation Guide)](docs/PROJE-SUNUM-REHBERI.md)
- **Final Demo & Teknik Savunma:**
  - **Katmanlı Mimari (N-Tier):** Bağımlılık yönü, SoC prensipleri ve değiştirilebilirlik analizi
  - **SOLID İlkeleri:** Somut kod örnekleri ve soyutlamalar (`IWorkHoursPolicy`, `IDateTimeProvider`, `PasswordHasher`)
  - **Dependency Injection & IoC:** Scoped vs Singleton servis yaşam döngüleri ve gevşek bağlılık
  - **Generic Repository & Unit of Work:** ORM soyutlaması ve atomik transaction garantisi
  - **DTO & Model Güvenliği:** Over-posting ve döngüsel JSON referanslarının önlenmesi
  - **JWT & HMAC-SHA512 Kimlik Doğrulama:** 128-byte salt şifreleme, RBAC ve Axios Bearer interceptor
  - **İş Kuralları & Çakışma Önleme:** $S_1 < E_2 \land E_1 > S_2$ algoritması ve mesai/tatil kuralları
  - **Global Exception Middleware & FluentValidation:** Standart `ApiResponse<T>` merkezi hata yönetimi

Uygulamaları Başlatmak İçin:

```bash
# 1. Backend API (Terminal 1)
dotnet run --project src/presentation/BarberAppointment.WebApi --launch-profile http
# http://localhost:5184/swagger

# 2. React Web Frontend (Terminal 2)
cd src/presentation/BarberAppointment.Web
npm run dev -- --port 3000
# http://localhost:3000

# 3. React Native / Expo Mobile App (Terminal 3)
cd src/presentation/BarberAppointment.Mobile
npm start
# iOS: 'i', Android: 'a', Web: 'w'
```

## Katmanlı Mimari Yapısı

```
BarberAppointment/
├── BarberAppointment.sln
├── src/
│   ├── libraries/
│   │   ├── BarberAppointment.Core/       (Cross-cutting / Shared)
│   │   ├── BarberAppointment.Domain/     (Entities & Domain Models)
│   │   ├── BarberAppointment.Data/       (Data Access, EF Core & Repositories)
│   │   └── BarberAppointment.Services/   (Business Logic, Services & DTOs)
│   └── presentation/
│       ├── BarberAppointment.WebApi/     (REST API & Swagger UI)
│       ├── BarberAppointment.Web/        (React 19 & Vite Web Frontend)
│       └── BarberAppointment.Mobile/     (React Native & Expo Mobil Uygulama)
├── samples/
│   └── BarberAppointment.SolidExamples/ (OOP & SOLID Örnekleri)
├── postman/                              (Postman Collection & Environment)
└── tests/                                (Uçtan Uca Otomatik Test Paketi)
```





