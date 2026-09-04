# Ek Geliştirme 6: Şifre Değiştirme ve E-posta Bildirimi

Bu doküman, Kuaför Randevu Yönetim Sistemi'nin **Ek Geliştirme 6 (Şifre Değiştirme ve E-posta Bildirimi)** özelliğinin mimari tasarımını, güvenlik kontrollerini, API endpointlerini, zengin HTML e-posta şablonunu, Web ve Mobil istemci entegrasyonlarını ve otomatik test sonuçlarını kapsamlı bir şekilde açıklar.

---

## 1. Genel Bakış ve Amaç

Kullanıcı hesaplarının güvenliğinin korunması için şifre değişikliği hassas bir operasyondur. Bu süreçte:
1. **Mevcut Şifre Doğrulaması:** Kullanıcının mevcut şifresi doğrulanmadan yeni şifre belirlenemez (`_passwordHasher.VerifyPasswordHash`).
2. **Güçlü Şifre & Eşitlik Kontrolü:** Yeni şifrenin en az 6 karakter olması, şifre tekrarı ile tam eşleşmesi ve **mevcut şifre ile aynı olmaması** kuralı hem FluentValidation (`ChangePasswordValidator`) hem de iş katmanında (`AuthService`) garanti altına alınmıştır.
3. **Otomatik Güvenlik E-posta Bildirimi:** Şifre değişikliği veritabanında onaylandığı anda, kullanıcının kayıtlı e-posta adresine modern ve duyarlı HTML formatında **Güvenlik Bilgilendirme E-postası** (`IEmailService.SendPasswordChangedNotificationAsync`) gönderilir.
4. **Web & Mobil Arayüz Entegrasyonu:**
   - Web üzerinde `UserProfileModal.jsx` içerisine "🔒 Şifre Değiştir" formu entegre edilmiştir.
   - Mobil uygulamada `ProfileScreen.js` içerisine "🔒 Şifre Değiştirme" kartı ve form alanları eklenmiştir.
5. **Uçtan Uca Doğrulama:** `tests/test_all_scenarios.sh` Bölüm 10 senaryoları ile yanlış şifre, aynı şifre, eşleşmeyen şifre, başarılı şifre değişimi, yeni şifreyle login ve eski şifrenin engellenmesi test edilerek 48/48 test başarısı elde edilmiştir.

---

## 2. Mimari Tasarım & Veri Akışı

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       ŞİFRE DEĞİŞTİRME & E-POSTA BİLDİRİMİ AKIŞI                │
│                                                                                 │
│   [ İstemci (Web / Mobile) ]                                                    │
│                │                                                                │
│                ▼                                                                │
│     PUT /api/auth/change-password  (Bearer Token, CurrentPassword, NewPassword) │
│                │                                                                │
│                ▼                                                                │
│   [ ChangePasswordValidator (FluentValidation) ]                                │
│        ├── CurrentPassword boş olamaz                                           │
│        ├── NewPassword en az 6 karakter olmalı                                  │
│        ├── NewPassword != CurrentPassword                                       │
│        └── ConfirmNewPassword == NewPassword                                    │
│                │                                                                │
│                ▼                                                                │
│   [ AuthService.ChangePasswordAsync ]                                           │
│        ├── 1. Mevcut şifre hash/salt doğrulaması (_passwordHasher)              │
│        │      (Hatalı ise -> BusinessException("Mevcut şifreniz hatalı."))      │
│        ├── 2. Yeni şifre için hash ve salt üretimi                             │
│        ├── 3. Veritabanında güncelleme ve SaveChangesAsync                      │
│        └── 4. IEmailService.SendPasswordChangedNotificationAsync Tetikleme      │
│                │                                                                │
│                ▼                                                                │
│   [ EmailService (SMTP / Simülasyon) ]                                         │
│        ├── HTML Güvenlik Şablonu Oluşturulur (GeneratePasswordChangedHtml)      │
│        └── Kullanıcının E-posta Adresine İletilir / Loglanır                    │
│                │                                                                │
│                ▼                                                                │
│   [ İstemciye 200 OK ve Güvenlik Mesajı İletilir ]                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Servis ve Arayüz Değişiklikleri

### 3.1. `IEmailService`
```csharp
public interface IEmailService
{
    // ...
    Task<bool> SendPasswordChangedNotificationAsync(
        string toEmail,
        string userName,
        DateTime changedAt,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);
}
```

### 3.2. `EmailService` Güvenlik E-Postası Şablonu
Şablon, modern kart tasarımı, işlem zaman damgası (UTC), ilgili hesap bilgisi ve "Bu işlemi siz yapmadıysanız" güvenlik uyarısını içeren profesyonel bir HTML çıktısı üretir.

---

## 4. API Endpoint Detayı

### `PUT /api/auth/change-password`
- **Yetki:** `Authorize` (JWT Bearer Token zorunlu)
- **Request Body (`ChangePasswordDto`):**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!",
  "confirmNewPassword": "NewSecurePassword456!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Şifreniz başarıyla güncellendi. Güvenliğiniz için kayıtlı e-posta adresinize bilgilendirme iletildi.",
  "data": null,
  "errors": null
}
```

---

## 5. Web ve Mobil İstemci Entegrasyonları

### 5.1. Web İstemcisi (`BarberAppointment.Web`)
- `UserProfileModal.jsx` içerisinde profil kartının altına "Şifre Değiştir" butonu eklenmiştir.
- Tıklandığında mevcut şifre, yeni şifre ve şifre tekrarı giriş alanları sunulur.
- Şifre başarıyla değiştirildiğinde kullanıcıya bildirim mesajı gösterilir ve form güvenle sıfırlanır.

### 5.2. Mobil İstemcisi (`BarberAppointment.Mobile`)
- `barberApi.js` `authApi` nesnesine `changePassword` fonksiyonu eklenmiştir.
- `ProfileScreen.js` içerisine "🔒 Şifre Değiştirme" kartı entegre edilmiş, gizlenebilir/açılabilir modern form yapısıyla mobil kullanıcı deneyimi sağlanmıştır.

---

## 6. Test ve Doğrulama

Otomasyon test paketi `tests/test_all_scenarios.sh` Bölüm 10 senaryoları ile test edilmiştir:

```bash
--- 10. Ek Geliştirme 6: Şifre Değiştirme ve E-posta Bildirimi ---
  [PASS] Ek 6 Test Kullanıcısı Kaydı & Token (HTTP 200)
  [PASS] PUT /api/auth/change-password (Yanlış Mevcut Şifre -> 400) (HTTP 400)
  [PASS] PUT /api/auth/change-password (Eşleşmeyen Yeni Şifre -> 400) (HTTP 400)
  [PASS] PUT /api/auth/change-password (Aynı Şifre Kuralı -> 400) (HTTP 400)
  [PASS] PUT /api/auth/change-password (Başarılı Değişim & E-posta Bildirimi) (HTTP 200)
  [PASS] POST /api/auth/login (Yeni Şifre ile Başarılı Giriş) (HTTP 200)
  [PASS] POST /api/auth/login (Eski Şifre ile Giriş Engellendi -> 400) (HTTP 400)

================================================================
   Test Sonuçları: 48 Başarılı / 0 Başarısız
================================================================
🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!
```

### Log Çıktısı Doğrulaması:
```
[EmailService - SİMÜLASYON MODU] E-posta gönderimi simüle edildi | Alıcı: sec_user_18116@example.com | Konu: Güvenlik Uyarısı: Şifreniz Değiştirildi — Kuaför Randevu Sistemi | Gönderen: Kuaför Randevu Sistemi <noreply@barberappointment.com> | Önizleme: [HTML İçerik]
```
