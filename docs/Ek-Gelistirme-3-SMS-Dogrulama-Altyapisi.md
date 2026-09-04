# Ek Geliştirme 3: SMS Doğrulama Altyapısı (ISmsService)

Bu doküman, Kuaför Randevu Yönetim Sistemi'nin ileri seviye geliştirmelerinden **Ek Geliştirme 3 (SMS Doğrulama Altyapısı - ISmsService)** özelliğinin mimari tasarımını, teknik detaylarını, güvenlik mekanizmalarını, konfigürasyonunu, API endpointlerini ve Web/Mobil istemci entegrasyonlarını kapsamlı bir şekilde açıklar.

---

## 1. Genel Bakış ve Amaç

Randevu ve kullanıcı hesap güvenliğinde cep telefonu numaralarının teyit edilmesi, sahte randevuların ve kötü niyetli bot aktivitelerinin engellenmesinde hayati bir role sahiptir. Ek Geliştirme 3 ile:
- Backend katmanında gevşek bağlı (loosely-coupled), genişletilebilir bir `ISmsService` arayüzü kurulmuştur.
- Gerçek SMS sağlayıcısı bulunmayan test ve geliştirme ortamları için zengin konsol loglaması ve otomatik simülasyon kodları üreten **`MockSmsService`** geliştirilmiştir.
- Telefon numarasına tek kullanımlık şifre (OTP - One Time Password) gönderme, kod üretme, geçerlilik süresi (TTL), yeniden istek engeli (cooldown / rate limiting) ve maksimum deneme sayısı (brute-force koruması) sağlayan **`ISmsVerificationService`** tasarlanmıştır.
- Anonim ve yetkilendirilmiş akışlar için modern REST API endpointleri (`SmsVerificationController`) eklenmiştir.
- Web istemcisinde (`BarberAppointment.Web`) kullanıcı dostu, sayaçlı ve 6 haneli OTP kutulu **SMS Doğrulama Modalı** geliştirilmiştir.
- Mobil istemcide (`BarberAppointment.Mobile`) Kullanıcı Profil Ekranı (`ProfileScreen`) içerisine entegre telefon doğrulama kartı eklenmiştir.
- Tüm akışlar otomatikleştirilmiş E2E test senaryolarıyla (`test_all_scenarios.sh`) doğrulanmıştır.

---

## 2. Mimari Tasarım ve SOLID Uyumu

Sistem, Onion / Temiz Mimari ilkelerine ve SOLID prensiplerine tam uyumlu olarak yapılandırılmıştır:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        İSTEMCİ KATMANI                                 │
│    Web (React + Tailwind)           Mobil (React Native / Expo)         │
│  [SmsVerificationModal.jsx]          [ProfileScreen.js SMS Kartı]       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST (JSON)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BarberAppointment.WebApi                             │
│  Controller: SmsVerificationController                                  │
│  Validation: SendSmsVerificationValidator, VerifySmsCodeValidator       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Dependency Injection)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   BarberAppointment.Services                            │
│  Interfaces:      ISmsVerificationService, ISmsService                  │
│  Implementations: SmsVerificationService, MockSmsService                │
│  Configurations:  SmsSettings (IOptions<SmsSettings>)                   │
│  Storage:         ConcurrentDictionary<string, SmsVerificationRecord>   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         [Mock / Simülasyon Modu]         [Gerçek SMS Sağlayıcıları]
           (Structured Logging)            (Twilio, Netgsm, İletimerkezi)
```

### SOLID İlkeleri Analizi:
- **Single Responsibility Principle (SRP):** 
  - `ISmsService` yalnızca SMS mesajlarının üçüncü parti sağlayıcıya ulaştırılmasından sorumludur.
  - `ISmsVerificationService` yalnızca kod üretimi, saklanması, TTL kontrolü, cooldown süresi ve doğrulama mantığından sorumludur.
  - `SmsVerificationController` yalnızca HTTP isteklerini karşılar, yetkilendirmeyi yönetir ve DTO dönüşümlerini yapar.
- **Open/Closed Principle (OCP):** Yeni bir SMS sağlayıcısı (örn. Twilio, Netgsm) eklendiğinde `SmsVerificationService` veya `SmsVerificationController` kodunda hiçbir değişiklik yapılmaz; yalnızca yeni bir `ISmsService` sınıfı yazılıp DI konteynerinde register edilir.
- **Liskov Substitution Principle (LSP):** `MockSmsService`, `ISmsService` sözleşmesini eksiksiz karşılar. Sistemin geri kalanı arkada mock servis mi yoksa gerçek SMS gateway mi çalıştığını bilmeden çalışır.
- **Interface Segregation Principle (ISP):** SMS gönderimi (`ISmsService`) ve SMS doğrulama yaşam döngüsü (`ISmsVerificationService`) bağımsız iki arayüze ayrılarak istemcilerin ihtiyaç duymadıkları metodlara bağımlı kalması engellenmiştir.
- **Dependency Inversion Principle (DIP):** Tüm üst seviye servisler ve controller'lar doğrudan somut sınıflara değil, `ISmsService` ve `ISmsVerificationService` arayüzlerine bağımlıdır.

---

## 3. Yapılandırma (`SmsSettings`)

SMS parametreleri `src/presentation/BarberAppointment.WebApi/appsettings.json` ve `appsettings.Development.json` dosyaları üzerinden merkezi olarak yönetilir:

```json
"SmsSettings": {
  "Provider": "Mock",
  "EnableSmsSending": false,
  "ApiKey": "",
  "ApiSecret": "",
  "SenderTitle": "BERBERAPPT",
  "CodeExpirationMinutes": 3,
  "CooldownSeconds": 60,
  "MaxVerificationAttempts": 3,
  "CodeLength": 6
}
```

### Yapılandırma Parametreleri Tablosu:

| Parametre | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `Provider` | string | `"Mock"` | Kullanılan sağlayıcı (`"Mock"`, `"Twilio"`, `"Netgsm"` vb.). |
| `EnableSmsSending` | bool | `false` | `false` ise simülasyon modunda çalışır (kod API yanıtında ve loglarda döner). `true` ise harici SMS API'sine istek atar. |
| `ApiKey` | string | `""` | SMS sağlayıcısı API anahtarı veya kullanıcı adı. |
| `ApiSecret` | string | `""` | SMS sağlayıcısı API gizli anahtarı veya şifresi. |
| `SenderTitle` | string | `"BERBERAPPT"` | SMS başlığı (Originator / Alfanümerik Başlık). |
| `CodeExpirationMinutes` | int | `3` | Üretilen doğrulama kodunun geçerlilik süresi (dakika). |
| `CooldownSeconds` | int | `60` | Aynı numaraya yeniden kod istemek için beklenmesi gereken süre (saniye). |
| `MaxVerificationAttempts`| int | `3` | Kod başına izin verilen maksimum hatalı deneme sayısı. Aşılırsa kod imha edilir. |
| `CodeLength` | int | `6` | Üretilecek numerik OTP uzunluğu (varsayılan 6 haneli). |

---

## 4. Güvenlik ve Doğrulama Mekanizmaları

SMS doğrulama altyapısında endüstri standardı güvenlik katmanları uygulanmıştır:

### 4.1. Kriptografik Rastgele OTP Üretimi
Kodlar `RandomNumberGenerator` kullanılarak 6 basamaklı (100000 - 999999) güvenli rastgele formatta üretilir:
```csharp
private string GenerateNumericCode(int length)
{
    var min = (int)Math.Pow(10, length - 1);
    var max = (int)Math.Pow(10, length) - 1;
    return RandomNumberGenerator.GetInt32(min, max + 1).ToString();
}
```

### 4.2. Yeniden İstek Engeli (Rate Limiting / Cooldown)
Kullanıcıların veya kötü niyetli botların aynı numaraya art arda SMS tetiklemesini engellemek için `CooldownSeconds` (60 saniye) kuralı işletilir. Süre dolmadan gelen istekler `400 Bad Request` ile reddedilir ve kalan saniye bilgisi hata mesajında bildirilir:
```
"Yeni bir doğrulama kodu istemek için lütfen 48 saniye bekleyiniz."
```

### 4.3. Süre Aşımı (Expiration / TTL)
Üretilen kodlar `CodeExpirationMinutes` (3 dakika) süreyle geçerlidir. Süresi dolmuş kodlarla yapılan doğrulama denemeleri `400 Bad Request` ile reddedilir.

### 4.4. Brute-Force Koruması (Max Attempts)
Bir kod için en fazla `MaxVerificationAttempts` (3) hatalı deneme yapılabilir. Hatalı denemede kalan hak sayısı kullanıcıya bildirilir (`"Hatalı kod. Kalan deneme hakkınız: 2"`). 3. hatalı denemenin ardından kod güvenlik sebebiyle otomatik olarak geçersiz kılınır.

### 4.5. Thread-Safe Eşzamanlılık
Doğrulama kayıtları bellek üzerinde thread-safe `ConcurrentDictionary<string, SmsVerificationRecord>` yapısında tutulur. Çoklu isteklerde yarış durumları (race conditions) engellenir.

---

## 5. REST API Endpointleri

Tüm endpointler standart `ApiResponse<T>` zarfı içinde yanıt üretir.

### 5.1. Doğrulama Kodu Gönder
- **URL:** `POST /api/sms/send-code`
- **Yetki:** Anonim (Public)
- **İstek Gövdesi:**
  ```json
  {
    "phoneNumber": "05559876543"
  }
  ```
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "data": {
      "isSuccess": true,
      "message": "Doğrulama kodu başarıyla oluşturuldu ve SMS ile iletildi.",
      "cooldownSeconds": 60,
      "expiresInSeconds": 180,
      "simulationCode": "482915"
    },
    "isSuccess": true,
    "statusCode": 200,
    "message": "Doğrulama kodu başarıyla gönderildi."
  }
  ```

### 5.2. Kodu Doğrula
- **URL:** `POST /api/sms/verify-code`
- **Yetki:** Anonim (Public)
- **İstek Gövdesi:**
  ```json
  {
    "phoneNumber": "05559876543",
    "code": "482915"
  }
  ```
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "data": {
      "isSuccess": true,
      "message": "Telefon numarası başarıyla doğrulandı.",
      "phoneNumber": "05559876543",
      "verifiedAt": "2026-09-04T09:25:55Z"
    },
    "isSuccess": true,
    "statusCode": 200,
    "message": "Telefon numarası başarıyla doğrulandı."
  }
  ```

### 5.3. Numara Durumunu Sorgula
- **URL:** `GET /api/sms/status?phoneNumber=05559876543`
- **Yetki:** Anonim (Public)
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "data": {
      "phoneNumber": "05559876543",
      "isVerified": true,
      "hasPendingCode": false,
      "remainingCooldownSeconds": 0,
      "remainingExpirationSeconds": 0,
      "remainingAttempts": 3
    },
    "isSuccess": true,
    "statusCode": 200
  }
  ```

### 5.4. Giriş Yapmış Kullanıcı Numarasını Güncelle
- **URL:** `POST /api/sms/verify-my-phone`
- **Yetki:** `Bearer Token` (`[Authorize]`)
- **İstek Gövdesi:**
  ```json
  {
    "phoneNumber": "05552223344",
    "code": "817294"
  }
  ```
- **Açıklama:** JWT claim'lerinden kullanıcının `UserId` değerini çözer. SMS kodunu doğrular, veritabanındaki `User.Phone` alanını atomik olarak günceller ve UnitOfWork üzerinden kaydeder.

---

## 6. Gerçek SMS Sağlayıcılarına Geçiş Rehberi

Geliştirme ortamında kullanılan `MockSmsService`, üretim aşamasında kolaylıkla gerçek bir sağlayıcıyla değiştirilebilir.

### Örnek: Twilio Sağlayıcı Implementasyonu

```csharp
using BarberAppointment.Services.Configurations;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace BarberAppointment.Services.Implementations;

public class TwilioSmsService : ISmsService
{
    private readonly SmsSettings _settings;
    private readonly ILogger<TwilioSmsService> _logger;

    public TwilioSmsService(IOptions<SmsSettings> settings, ILogger<TwilioSmsService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        TwilioClient.Init(_settings.ApiKey, _settings.ApiSecret);
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        try
        {
            var messageResource = await MessageResource.CreateAsync(
                to: new PhoneNumber(phoneNumber),
                from: new PhoneNumber(_settings.SenderTitle),
                body: message);

            return messageResource.Status != MessageResource.StatusEnum.Failed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Twilio SMS gönderim hatası: {PhoneNumber}", phoneNumber);
            return false;
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string phoneNumber, string code, int expirationMinutes, CancellationToken cancellationToken = default)
    {
        var msg = $"{_settings.SenderTitle}: Kuaför Randevu doğrulama kodunuz: {code}. Bu kod {expirationMinutes} dakika geçerlidir.";
        return await SendSmsAsync(phoneNumber, msg, cancellationToken);
    }
}
```

### DI Kaydı Değişimi (`ServiceRegistration.cs`):
```csharp
if (configuration.GetValue<string>("SmsSettings:Provider") == "Twilio")
{
    services.AddScoped<ISmsService, TwilioSmsService>();
}
else
{
    services.AddScoped<ISmsService, MockSmsService>();
}
```

---

## 7. Web İstemcisi Entegrasyonu (React)

Web arayüzünde (`BarberAppointment.Web`) kullanıcı dostu bir doğrulama modalı sunulmuştur:

- **Bileşen:** `src/components/SmsVerificationModal.jsx`
- **Tetikleyici:** `src/components/Navbar.jsx` üst menüsünde "SMS Doğrula" butonu.
- **Özellikler:**
  - Türkiye telefon formatı (`05XX XXX XX XX`) maskeli giriş.
  - Kod gönderildiğinde dinamik geri sayım sayacı (`cooldown`).
  - 6 haneli, otomatik sonraki kutuya odaklanan OTP kutucukları.
  - Simülasyon modunda tek tıkla test kodunu dolduran **"🧪 Simülasyon Kodunu Doldur"** butonu.
  - Başarılı doğrulamada altın sarısı onay rozeti ve başarılı doğrulama durumu.

---

## 8. Mobil İstemci Entegrasyonu (React Native / Expo)

Mobil uygulamada (`BarberAppointment.Mobile`) Kullanıcı Profil Ekranı içerisine yerleşik SMS doğrulama kartı entegre edilmiştir:

- **Bileşen / Ekran:** `src/screens/ProfileScreen.js`
- **Özellikler:**
  - Kullanıcının mevcut telefon durumunu gösteren durum rozeti (Doğrulanmadı / Doğrulandı).
  - Telefon numarası girişi veya mevcut numaranın otomatik kullanımı.
  - "Kod Gönder" butonu ve 60 saniyelik geri sayım sayacı.
  - 6 haneli kod girişi alanı.
  - Geliştiriciler ve test kullanıcıları için simülasyon kodunu otomatik yapıştıran hızlı buton.
  - Yetkilendirilmiş `verifyMyPhone` çağrısıyla kullanıcı profilini anında güncelleme.

---

## 9. Otomatik E2E Test Koşumu ve Doğrulama

Tüm iş kuralları `tests/test_all_scenarios.sh` betiğinde Bölüm 7 olarak otomatikleştirilmiştir. 7 alt senaryo eksiksiz test edilmiştir:

```bash
--- 7. Ek Geliştirme 3: SMS Doğrulama Altyapısı (ISmsService) ---
  [PASS] POST /api/sms/send-code (Geçerli Telefon -> 200 OK) (HTTP 200)
  [PASS] POST /api/sms/send-code (Geçersiz Telefon -> 400 Bad Request) (HTTP 400)
  [PASS] POST /api/sms/send-code (Cooldown Engeli -> 400 Bad Request) (HTTP 400)
  [PASS] POST /api/sms/verify-code (Hatalı Kod -> 400 Bad Request) (HTTP 400)
  [PASS] POST /api/sms/verify-code (Doğru Simülasyon Kodu -> 200 OK) (HTTP 200)
  [PASS] GET /api/sms/status (Durum Sorgulama -> 200 OK) (HTTP 200)
  [PASS] POST /api/sms/verify-my-phone (Kullanıcı Telefon Güncelleme -> 200 OK) (HTTP 200)

================================================================
   Test Sonuçları: 33 Başarılı / 0 Başarısız
================================================================
🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!
```

---

## 10. Sonuç

Ek Geliştirme 3 (SMS Doğrulama Altyapısı), sistemin hesap ve randevu güvenliğini üst seviyeye taşımıştır. Mock servis desteği sayesinde ek bir donanım veya ücretli SMS gateway aboneliği gerektirmeden tam kapsamlı geliştirme, test ve simülasyon ortamı sağlanmış; gerektiğinde tek bir konfigürasyonla ticari SMS sağlayıcılarına geçiş yapılabilecek kurumsal bir altyapı inşa edilmiştir.

