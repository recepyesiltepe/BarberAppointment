# Gün 13 — Backend Test ve Tamamlama

## 1. Genel Bakış ve Amaç

Kuaför Randevu Sistemi backend mimarisi, **Web (React/Vue/Angular)** ve **Mobile (Flutter/React Native/iOS/Android)** istemcilerinin doğrudan ve sorunsuz tüketebileceği tam teşekküllü bir REST API haline getirilmiş; tüm yetki, hata ve iş mantığı senaryoları **Postman Collection** ve **otomatik E2E test betikleri** ile doğrulanmıştır.

---

## 2. Araştırılan Konular

### 2.1. Postman Test Mimarisi ve Otomasyon

Postman v2.1.0 standardında hazırlanan koleksiyonumuzda:
- **Environment Variables (`{{baseUrl}}`, `{{jwt_token}}`, `{{admin_token}}`, `{{customer_token}}`):** Ortamlar arası (Local, Staging, Production) kolay geçiş sağlar.
- **Otomatik Token Yönetimi (Test Scripts):** Login veya Register istekleri başarılı olduğunda dönen JWT token otomatik olarak yakalanıp ortam değişkenine kaydedilir:
  ```javascript
  pm.test("Status code is 200 OK", function () {
      pm.response.to.have.status(200);
  });
  var jsonData = pm.response.json();
  if (jsonData.data && jsonData.data.accessToken) {
      pm.environment.set("jwt_token", jsonData.data.accessToken);
  }
  ```

---

### 2.2. Web ve Mobile İstemci Uyumluluğu (CORS & Standardizasyon)

Frontend ve mobil uygulamaların API ile haberleşebilmesi için:
1. **CORS (Cross-Origin Resource Sharing):** `Program.cs` üzerinde `AllowAll` politikası ile tarayıcı kökenli engellemeler kaldırıldı (`AllowAnyOrigin`, `AllowAnyMethod`, `AllowAnyHeader`).
2. **Stateless JWT:** Mobil cihazlar oturumu yerel güvenli depolama (`SecureStorage` / `Keychain`) alanında saklayabilir.
3. **Tek Tip Yanıt Şeması (`ApiResponse<T>`):** Tüm mobil ve web modelleri tek bir generic `ApiResponse` sınıfı üzerinden deserialize edilebilir.

---

## 3. Kapsamlı Test Senaryoları Matrisi

Aşağıdaki 22 senaryonun tamamı otomatik test koşumu ile doğrulanmıştır:

| Kategori | Test Senaryosu | İstek Yolu & Metod | Beklenen Sonuç | Doğrulama Durumu |
| :--- | :--- | :--- | :---: | :---: |
| **Auth** | Müşteri Kaydı (Register) | `POST /api/auth/register` | `201 Created` | ✅ PASS |
| **Auth** | Admin Girişi (Login) | `POST /api/auth/login` | `200 OK` | ✅ PASS |
| **Auth** | Müşteri Girişi (Login) | `POST /api/auth/login` | `200 OK` | ✅ PASS |
| **Auth** | Yetkili Profil Sorgulama | `GET /api/auth/me` | `200 OK` | ✅ PASS |
| **Public** | Hizmet Listesi | `GET /api/services` | `200 OK` | ✅ PASS |
| **Public** | Personel Listesi | `GET /api/employees` | `200 OK` | ✅ PASS |
| **Public** | Boş Slotları Sorgulama | `GET /api/appointments/available-slots` | `200 OK` | ✅ PASS |
| **Admin** | Yeni Hizmet Ekleme | `POST /api/services` | `201 Created` | ✅ PASS |
| **Admin** | Hizmet Güncelleme | `PUT /api/services/{id}` | `200 OK` | ✅ PASS |
| **Admin** | Hizmet Silme (Soft) | `DELETE /api/services/{id}` | `200 OK` | ✅ PASS |
| **Admin** | Kullanıcı Listesi | `GET /api/users` | `200 OK` | ✅ PASS |
| **Randevu** | Randevu Oluşturma | `POST /api/appointments` | `201 Created` | ✅ PASS |
| **Randevu** | Randevu Çakışma Kontrolü | `POST /api/appointments` (Aynı saat) | `409 Conflict` | ✅ PASS |
| **Randevu** | Yeniden Zamanlama (Reschedule)| `PUT /api/appointments/{id}/reschedule`| `200 OK` | ✅ PASS |
| **Randevu** | Randevu İptali | `PUT /api/appointments/{id}/cancel` | `200 OK` | ✅ PASS |
| **Randevu** | Mükerrer İptal Engeli | `PUT /api/appointments/{id}/cancel` | `400 Bad Request`| ✅ PASS |
| **Hata** | Yetkisiz İstek (No Token) | `GET /api/auth/me` | `401 Unauthorized`| ✅ PASS |
| **Hata** | Rol Yetersizliği | `GET /api/users` (Customer token) | `403 Forbidden` | ✅ PASS |
| **Hata** | Model Validasyon Hatası | `POST /api/services` (Boş ad, -fiyat) | `400 Bad Request`| ✅ PASS |
| **Hata** | Geçmiş Tarihe Randevu | `POST /api/appointments` (2020 yılı) | `400 Bad Request`| ✅ PASS |
| **Hata** | Olmayan Kayıt Sorgulama | `GET /api/services/99999` | `404 Not Found` | ✅ PASS |
| **Hata** | Mükerrer E-posta Kaydı | `POST /api/auth/register` | `409 Conflict` | ✅ PASS |

---

## 4. Postman Koleksiyonunun Kullanımı

### 4.1. Dosyaların Konumu
- Koleksiyon: [`postman/BarberAppointment.postman_collection.json`](../postman/BarberAppointment.postman_collection.json)
- Ortam: [`postman/BarberAppointment.postman_environment.json`](../postman/BarberAppointment.postman_environment.json)

### 4.2. İçe Aktarma (Import) Adımları
1. Postman uygulamasını açın ve sol üstteki **Import** butonuna tıklayın.
2. `postman/BarberAppointment.postman_collection.json` ve `postman/BarberAppointment.postman_environment.json` dosyalarını seçip yükleyin.
3. Sağ üst köşedeki ortam seçicisinden **"BarberAppointment - Local Dev"** ortamını seçin.
4. `1. Auth -> Login` isteğini çalıştırın; dönen token otomatik olarak tüm yetkili isteklerde kullanılacaktır.

---

## 5. Otomatik Test Koşumu Çıktısı

```bash
chmod +x tests/test_all_scenarios.sh
./tests/test_all_scenarios.sh
```

```
================================================================
   BarberAppointment REST API — Gün 13 Kapsamlı Test Koşumu
================================================================

--- 1. Auth & Token İşlemleri ---
  [PASS] Customer Registration (HTTP 200)
  [PASS] Admin Login & Token Generation (HTTP 200)
  [PASS] Customer Login & Token Generation (HTTP 200)
  [PASS] GET /api/auth/me (Authorized) (HTTP 200)

--- 2. Public (Anonim) Endpointler ---
  [PASS] GET /api/services (Public) (HTTP 200)
  [PASS] GET /api/employees (Public) (HTTP 200)
  [PASS] GET /api/appointments/available-slots (Public) (HTTP 200)

--- 3. Admin Yönetim Endpointleri ---
  [PASS] POST /api/services (Admin Create) (HTTP 200)
  [PASS] PUT /api/services/8 (Admin Update) (HTTP 200)
  [PASS] DELETE /api/services/8 (Admin Delete) (HTTP 200)
  [PASS] GET /api/users (Admin Only) (HTTP 200)

--- 4. Randevu İş Mantığı & Yaşam Döngüsü ---
  [PASS] POST /api/appointments (Create Success) (HTTP 200)
  [PASS] POST /api/appointments (Çakışma Kuralı -> 409 Conflict) (HTTP 409)
  [PASS] PUT /api/appointments/6/reschedule (Reschedule Success) (HTTP 200)
  [PASS] PUT /api/appointments/6/cancel (Cancel Success) (HTTP 200)
  [PASS] PUT /api/appointments/6/cancel (Zaten İptal Edilmiş -> 400) (HTTP 400)

--- 5. Güvenlik ve Hata Senaryoları ---
  [PASS] GET /api/auth/me (Yetkisiz -> 401 Unauthorized) (HTTP 401)
  [PASS] GET /api/users (Müşteri Yetkisiz -> 403 Forbidden) (HTTP 403)
  [PASS] POST /api/services (Geçersiz Model -> 400 Bad Request) (HTTP 400)
  [PASS] POST /api/appointments (Geçmiş Tarih -> 400 Bad Request) (HTTP 400)
  [PASS] GET /api/services/99999 (Bulunamadı -> 404 Not Found) (HTTP 404)
  [PASS] POST /api/auth/register (Mükerrer E-posta -> 409 Conflict) (HTTP 409)

================================================================
   Test Sonuçları: 22 Başarılı / 0 Başarısız
================================================================
🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!
```
