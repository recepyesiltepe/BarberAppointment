# Ek Geliştirme 1: E-posta Gönderim Altyapısı (IEmailService)

Bu doküman, Kuaför Randevu Yönetim Sistemi'nin ileri seviye geliştirmelerinden **Ek Geliştirme 1 (E-posta Gönderim Altyapısı)** özelliğinin mimari tasarımını, teknik detaylarını, konfigürasyonunu ve kullanımını açıklar.

---

## 1. Genel Bakış ve Amaç

Randevu tabanlı sistemlerde müşterilerin randevu durumlarından anlık ve güvenilir şekilde haberdar edilmesi müşteri memnuniyeti açısından kritiktir. Ek Geliştirme 1 ile:
- Backend'de gevşek bağlı (loosely-coupled) bir `IEmailService` servis arayüzü kurulmuştur.
- SMTP sunucu bağlantı ve kimlik doğrulama parametreleri `appsettings.json` ve ASP.NET Core `IOptions<EmailSettings>` deseni üzerinden yönetilir.
- Servis, .NET Dependency Injection (DI) konteynerine `Scoped` yaşam döngüsüyle kaydedilmiştir.
- Randevu oluşturma (`Create`), randevu güncelleme/erteleme (`Reschedule`) ve randevu iptal (`Cancel`) işlemlerinde müşteriye otomatik HTML e-posta bildirimleri iletilir.
- Geliştirme/test ortamları için sıfır bağımlılıkla çalışan **Simülasyon Modu** ve üretim için **Gerçek SMTP Gönderim Modu** sağlanmıştır.

---

## 2. Mimari Tasarım ve SOLID Uyumu

```
┌─────────────────────────────────────────────────────────────┐
│                    BarberAppointment.WebApi                 │
│  Controllers: AppointmentsController (POST /test-email)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Dependency Injection)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   BarberAppointment.Services                │
│  Interfaces:      IEmailService                             │
│  Implementations: EmailService                              │
│  Configurations:  EmailSettings (IOptions<EmailSettings>)    │
│  Consumers:       AppointmentService                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   [Simülasyon / Log Modu]         [Gerçek SMTP Modu]
   (ILogger structured log)        (System.Net.Mail.SmtpClient)
```

- **Single Responsibility Principle (SRP):** E-posta formatlama, şablon oluşturma ve SMTP iletişimi yalnızca `EmailService` sınıfının sorumluluğundadır. `AppointmentService` yalnızca iş kurallarını işletir ve bildirim göndermek için `IEmailService` arayüzünü çağırır.
- **Dependency Inversion Principle (DIP):** `AppointmentService` doğrudan SMTP kütüphanesine değil, `IEmailService` soyutlamasına bağımlıdır.
- **Resilience (Dayanıklılık):** E-posta sunucusundaki geçici ağ veya kimlik doğrulama hataları, müşterinin randevu alma veya iptal etme işlemini kesintiye uğratmaz (try-catch & structured logging).

---

## 3. Yapılandırma (`EmailSettings`)

E-posta ayarları `src/presentation/BarberAppointment.WebApi/appsettings.json` dosyasında tanımlanmıştır:

```json
"EmailSettings": {
  "Host": "smtp.mailtrap.io",
  "Port": 587,
  "EnableSsl": true,
  "UserName": "",
  "Password": "",
  "SenderEmail": "noreply@barberappointment.com",
  "SenderName": "Kuaför Randevu Sistemi",
  "EnableEmailSending": false
}
```

### Parametre Açıklamaları:

| Alan Adı | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `Host` | string | `smtp.mailtrap.io` | SMTP sunucu adresi (örn. `smtp.gmail.com`, `smtp.sendgrid.net`). |
| `Port` | int | `587` | SMTP portu (genellikle TLS için `587`, SSL için `465`). |
| `EnableSsl` | bool | `true` | Güvenli SSL/TLS bağlantısı aktifliği. |
| `UserName` | string | `""` | SMTP kullanıcı adı veya API anahtarı. |
| `Password` | string | `""` | SMTP parolası veya uygulama şifresi. |
| `SenderEmail` | string | `noreply@...` | Gönderici e-posta adresi (`From`). |
| `SenderName` | string | `Kuaför Randevu...` | Gönderici görünen adı. |
| `EnableEmailSending` | bool | `false` | **`false`:** Simülasyon modu (e-postalar loglanır, harici SMTP aranmaz).<br>**`true`:** Gerçek SMTP sunucusuna bağlanarak teslim eder. |

---

## 4. Popüler SMTP Sağlayıcı Yapılandırma Örnekleri

### A) Mailtrap (Test & Geliştirme İçin İdeal)
```json
"EmailSettings": {
  "Host": "sandbox.smtp.mailtrap.io",
  "Port": 2525,
  "EnableSsl": true,
  "UserName": "your_mailtrap_user",
  "Password": "your_mailtrap_password",
  "SenderEmail": "noreply@barberappointment.com",
  "SenderName": "Kuaför Randevu Sistemi",
  "EnableEmailSending": true
}
```

### B) Gmail (Uygulama Şifresi ile)
```json
"EmailSettings": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "EnableSsl": true,
  "UserName": "kuafor.randevu@gmail.com",
  "Password": "xxxx xxxx xxxx xxxx", // Google Hesabı -> Güvenlik -> Uygulama Şifreleri
  "SenderEmail": "kuafor.randevu@gmail.com",
  "SenderName": "Kuaför Randevu Sistemi",
  "EnableEmailSending": true
}
```

---

## 5. Desteklenen E-posta Şablonları

Sistemde modern, responsive ve Kuaför Randevu Sistemi kurumsal kimliğine uygun (Dark & Amber & Gold vurgulu) HTML e-posta şablonları hazırlanmıştır:

1. **Randevu Onayı (`SendAppointmentConfirmationAsync`):**
   - Yeni randevu oluşturulduğunda tetiklenir.
   - Randevu kodu, hizmet adı, uzman kuaför, gün/saat, süre, tutar ve özel notları içeren kart tablosu sunar.
2. **Randevu İptali (`SendAppointmentCancellationAsync`):**
   - Randevu iptal edildiğinde tetiklenir.
   - İptal edilen randevu bilgilerini ve serbest bırakılan saat dilimini nazik bir dille bildirir.
3. **Randevu Saati Güncelleme (`SendAppointmentRescheduledAsync`):**
   - Randevu saati değiştirildiğinde tetiklenir.
   - Yeni gün ve saat dilimini belirgin mavi vurguyla müşteriye iletir.

---

## 6. Doğrulama ve Test Yöntemleri

### A) Swagger UI Üzerinden Test
1. API'yi başlatın:
   ```bash
   dotnet run --project src/presentation/BarberAppointment.WebApi --launch-profile http
   ```
2. Tarayıcıda `http://localhost:5184/swagger` adresini açın.
3. **Appointments** grubundaki `POST /api/appointments/test-email` endpoint'ine gidin.
4. `toEmail` parametresine e-posta adresinizi girip **Execute** butonuna tıklayın.

### B) cURL ile Test
```bash
curl -X POST "http://localhost:5184/api/appointments/test-email?toEmail=test@example.com"
```
**Başarılı Yanıt:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Test e-postası başarıyla işlendi (gönderildi veya simüle edildi).",
  "data": null,
  "errors": null
}
```

### C) Otomatik Test Koşumu
Tüm REST API senaryoları ve yeni eklenen e-posta testleri için:
```bash
./tests/test_all_scenarios.sh
```

