# Kuaför Randevu Yönetim Sistemi — Proje Sunum Rehberi

## 1. Proje Özeti ve Vizyon

**Kuaför Randevu Yönetim Sistemi**, modern kuaför salonları ve müşterileri arasındaki randevu, personel ve hizmet yönetimini tamamen dijitalleştiren; **Web API (Backend)**, **Web Yönetim Paneli (Admin/Staff)** ve **Mobil Uygulama (Müşteri/Personel)** ayaklarından oluşan kurumsal ölçekli bir tam yığın (Full-Stack) çözümdür.

---

## 2. Teknoloji Yığını (Tech Stack)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KUAFÖR RANDEVU SİSTEMİ                         │
├───────────────────┬─────────────────────┬──────────────────────────────┤
│ 🔙 BACKEND API    │ 🌐 WEB PANEL        │ 📱 MOBİL UYGULAMA            │
├───────────────────┼─────────────────────┼──────────────────────────────┤
│ • .NET 10 (C#)    │ • React 19          │ • React Native (Expo SDK 57) │
│ • ASP.NET Core    │ • Vite 8            │ • React 19                   │
│ • EF Core 10      │ • Vanilla CSS       │ • Axios JWT Interceptor      │
│ • MS SQL Server   │ • Axios             │ • iOS & Android & Web        │
│ • JWT + HMAC512   │ • Dark & Amber UX   │ • Wizard Booking Flow        │
│ • FluentValidation│ • Responsive Design │ • Segmented Appointment Tabs │
└───────────────────┴─────────────────────┴──────────────────────────────┘
```

---

## 3. Katmanlı Mimari (N-Tier Architecture)

- **Presentation Katmanı:**
  - `BarberAppointment.WebApi`: RESTful HTTP endpointleri, OpenAPI/Swagger UI, Global Exception Middleware, CORS ve JWT Bearer Auth.
  - `BarberAppointment.Web`: React 19 tabanlı yönetim paneli (KPI Dashboard, Hizmetler, Personeller, Randevular).
  - `BarberAppointment.Mobile`: React Native & Expo tabanlı 4 adımlı randevu alma sihirbazı ve randevu yönetim mobil uygulaması.
- **Business Logic Katmanı (`BarberAppointment.Services`):**
  - Randevu çakışma önleme motoru ($S_1 < E_2 \land E_1 > S_2$).
  - 09:00–20:00 çalışma saatleri ve pazar günü tatil politikası (`IWorkHoursPolicy`).
  - Personel yetki kontrolü (`EmployeeService`).
  - FluentValidation doğrulama kuralları.
  - **Ek Geliştirme 1:** `IEmailService` e-posta gönderim altyapısı (SMTP yapılandırması, `IOptions<EmailSettings>`, randevu onay/iptal/erteleme HTML şablonları).
- **Data Access Katmanı (`BarberAppointment.Data`):**
  - Generic `Repository<T>`, `UnitOfWork` ve özelleşmiş repository'ler.
  - Entity Framework Core Code-First `AppDbContext` ve Fluent API ilişkileri.
- **Core & Domain Katmanları (`BarberAppointment.Core`, `BarberAppointment.Domain`):**
  - Temel entity'ler, Enum'lar (`Role`, `AppointmentStatus`), `IDateTimeProvider` zaman soyutlaması ve `ApiResponse<T>` standart yanıt formatı.

---

## 4. Canlı Demo Akışı ve Senaryolar

### Senaryo 1: Web Yönetim Paneli (Admin)
1. **Giriş:** `👑 Admin` butonuna tıklayarak tek tıkla oturum açma.
2. **Dashboard:** 4 KPI kartı (Toplam Randevu, Ciro, Aktif Personel, Aktif Hizmetler) ve son randevu akışını inceleme.
3. **Hizmetler (Services):** Yeni bir saç bakım paketi ekleme, süre/fiyat güncelleme.
4. **Personeller (Employees):** Yeni bir uzman kuaför ekleme ve yetkili olduğu hizmetleri onay kutularıyla atama.
5. **Randevular:** Canlı randevu takvimini personele/duruma göre filtreleme, randevuyu tamamlama (`Complete`).

---

### Senaryo 2: Mobil Randevu Akışı (Müşteri)
1. **Giriş:** `👤 Müşteri` butonu ile mobil uygulamaya giriş.
2. **Keşfet (Home):** Salon hizmetleri ve uzman kadroyu inceleme.
3. **Randevu Al (Booking Wizard):**
   - *1. Adım:* Hizmet seçimi (Örn: Saç Kesimi - 300 ₺)
   - *2. Adım:* Uzman kuaför seçimi (Örn: Ali Usta)
   - *3. Adım:* 7 günlük takvimden gün seçimi ve backend'in hesapladığı boş slotlardan saat seçimi (Örn: 14:00)
   - *4. Adım:* Özet kontrolü, not ekleme ve **"Randevuyu Onayla"** butonuna basma.
   - *5. Adım:* Bilet/Fiş ekranı ve randevu detaylarının onaylanması.
4. **Randevularım:** Yaklaşan randevular sekmesinde geri sayım sayacını görme (`⏳ 1 gün sonra`) ve dilediğinde tek tıkla randevuyu iptal etme.

---

## 5. Doğrulama ve Test Sonuçları

- **24/24 API E2E Otomatik Test Başarısı (E-posta Dahil):** `./tests/test_all_scenarios.sh`
- **SOLID İlkeleri Doğrulaması:** `dotnet run --project samples/BarberAppointment.SolidExamples`
- **Frontend & Mobil Derleme:** 0 Hata, 0 Uyarı
