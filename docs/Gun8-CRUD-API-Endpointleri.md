# BarberAppointment — Gün 8: CRUD API Endpointleri

**Kapsam:** REST endpoint tasarımı, HTTP metodları, status kodları, Swagger/OpenAPI entegrasyonu; Services ve Employees için tam CRUD (GET/POST/PUT/DELETE) uygulaması ve Swagger UI üzerinden canlı test.

---

## 1. Araştırılacak Temel Konular

### 1.1 REST Endpoint Tasarımı Prensipleri

REST (Representational State Transfer) API'ler, URL yolu ile HTTP metodunu birleştirerek kaynakları (resource) yönetir.

| HTTP Metodu | Amaç | Örnek | HTTP Status |
| :--- | :--- | :--- | :--- |
| `GET` | Okuma (tek veya liste) | `GET /api/services` | `200 OK` |
| `POST` | Yeni kayıt oluşturma | `POST /api/services` | `201 Created` |
| `PUT` | Tam güncelleme | `PUT /api/services/{id}` | `200 OK` |
| `PATCH` | Kısmi güncelleme | `PATCH /api/services/{id}/activate` | `200 OK` |
| `DELETE` | Silme | `DELETE /api/services/{id}` | `200 OK` / `204 No Content` |

**Bu projede kullanılan önemli durum kodları:**

| Status Kodu | Anlamı | Kullanım Yeri |
| :--- | :--- | :--- |
| `200 OK` | Genel başarı | GET, PUT, DELETE, özel eylemler |
| `201 Created` | Kayıt oluşturuldu | POST (oluşturma) |
| `400 Bad Request` | Geçersiz istek / iş kuralı ihlali | Doğrulama hataları |
| `404 Not Found` | Kayıt bulunamadı | ID ile sorgularda |
| `409 Conflict` | Çakışma | Randevu çakışması |
| `500 Internal Server Error` | Sunucu hatası | İşlenmeyen istisnalar |

### 1.2 Swagger / OpenAPI Nedir?

- **OpenAPI Specification (OAS):** REST API'leri makine ile okunabilir (JSON/YAML) biçimde tanımlayan bir standart.
- **Swagger UI:** OpenAPI tanımını interaktif, tarayıcı tabanlı bir arayüze çeviren araç. Her endpoint test edilebilir.
- **Swashbuckle:** ASP.NET Core projesinden otomatik olarak OpenAPI JSON belgesi üreten ve Swagger UI sunan kütüphane.

---

## 2. Eklenen Bağımlılıklar ve Konfigürasyon

```xml
<!-- BarberAppointment.WebApi.csproj -->
<PackageReference Include="Swashbuckle.AspNetCore" Version="10.2.3" />
```

### Program.cs — Swagger Konfigürasyonu

```csharp
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BarberAppointment API",
        Version = "v1",
        Description = "Kuaför Randevu Yönetim Sistemi REST API"
    });
    // Controller /// summary'leri Swagger UI'da görüntülemek için
    var xmlPath = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xmlPath))
        options.IncludeXmlComments(xmlPath);
});

// Middleware
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "BarberAppointment API v1");
    c.RoutePrefix = "swagger";   // http://localhost:5184/swagger
    c.DisplayRequestDuration();  // İstek süresini göster
});
```

---

## 3. Services Endpointleri (Tam CRUD)

```
GET     /api/services?activeOnly=true    → Aktif hizmetleri listele
GET     /api/services/{id}               → Hizmet detayı
POST    /api/services                    → Yeni hizmet oluştur
PUT     /api/services/{id}               → Hizmet güncelle
DELETE  /api/services/{id}               → Hizmet sil (soft delete)
```

### Request / Response Şemaları

**`CreateServiceDto` (POST gövdesi):**
```json
{
  "name": "Fön",
  "durationMinutes": 25,
  "price": 200
}
```

**`UpdateServiceDto` (PUT gövdesi):**
```json
{
  "name": "Fön Maşa",
  "durationMinutes": 30,
  "price": 220,
  "isActive": true
}
```

**`ServiceDto` (yanıt):**
```json
{
  "id": 4,
  "name": "Fön Maşa",
  "durationMinutes": 30,
  "price": 220.00,
  "isActive": true
}
```

---

## 4. Employees Endpointleri (Tam CRUD)

```
GET     /api/employees?activeOnly=false            → Personel listesi
GET     /api/employees/{id}                        → Personel detayı (hizmetleriyle)
GET     /api/employees/by-service/{serviceId}      → Belirtilen hizmeti sunan personeller
POST    /api/employees                             → Yeni personel oluştur
PUT     /api/employees/{id}                        → Personel güncelle
DELETE  /api/employees/{id}                        → Personel sil (soft delete)
POST    /api/employees/{id}/services               → Hizmet ataması yap (mevcut atamaların yerini alır)
```

### Request / Response Şemaları

**`CreateEmployeeDto` (POST gövdesi):**
```json
{
  "fullName": "Hasan Usta",
  "title": "Saç & Sakal Uzmanı",
  "userId": null,
  "serviceIds": [1, 2, 3]
}
```

**`UpdateEmployeeDto` (PUT gövdesi):**
```json
{
  "fullName": "Hasan Çelik",
  "title": "Baş Berber",
  "isActive": true,
  "serviceIds": [1, 3]
}
```

**`AssignServicesDto` (POST /services gövdesi):**
```json
{
  "serviceIds": [1, 2]
}
```

---

## 5. Swagger UI Erişimi

API geliştirme ortamında çalışırken:

```
http://localhost:5184/swagger
```

Swagger JSON tanım dosyası:
```
http://localhost:5184/swagger/v1/swagger.json
```

---

## 6. Toplam Endpoint Envanteri (Gün 8 Sonu)

| # | Metod | Yol | Açıklama |
| :--- | :--- | :--- | :--- |
| 1 | `GET` | `/api/Appointments` | Tüm randevuları listele |
| 2 | `POST` | `/api/Appointments` | Yeni randevu oluştur |
| 3 | `GET` | `/api/Appointments/{id}` | Randevu detayı |
| 4 | `GET` | `/api/Appointments/employee/{employeeId}` | Personelin randevuları |
| 5 | `GET` | `/api/Appointments/user/{userId}` | Kullanıcının randevuları |
| 6 | `PUT` | `/api/Appointments/{id}/cancel` | Randevu iptal |
| 7 | `PUT` | `/api/Appointments/{id}/complete` | Randevu tamamla |
| 8 | `GET` | `/api/Employees` | Tüm personeli listele |
| 9 | `POST` | `/api/Employees` | Yeni personel oluştur |
| 10 | `GET` | `/api/Employees/{id}` | Personel detayı |
| 11 | `PUT` | `/api/Employees/{id}` | Personel güncelle |
| 12 | `DELETE` | `/api/Employees/{id}` | Personel sil |
| 13 | `GET` | `/api/Employees/by-service/{serviceId}` | Hizmete göre personel |
| 14 | `POST` | `/api/Employees/{id}/services` | Personele hizmet ata |
| 15 | `GET` | `/api/Services` | Tüm hizmetleri listele |
| 16 | `POST` | `/api/Services` | Yeni hizmet oluştur |
| 17 | `GET` | `/api/Services/{id}` | Hizmet detayı |
| 18 | `PUT` | `/api/Services/{id}` | Hizmet güncelle |
| 19 | `DELETE` | `/api/Services/{id}` | Hizmet sil |
| 20 | `GET` | `/api/Users` | Kullanıcıları listele |
| 21 | `POST` | `/api/Users` | Yeni kullanıcı oluştur |
| 22 | `GET` | `/api/Users/{id}` | Kullanıcı detayı |

**Toplam: 22 endpoint**

---

## 7. Canlı Test Çıktıları

### Services CRUD Testi

```
GET  /api/services?activeOnly=false → 3 hizmet listelendi
POST /api/services {"name":"Fön",...} → ID: 4 oluşturuldu
GET  /api/services/4 → "Fön" detayı döndü
PUT  /api/services/4 {"name":"Fön Maşa",...} → "Hizmet başarıyla güncellendi."
DEL  /api/services/4 → "Hizmet başarıyla silindi (pasife alındı)."
```

### Employees CRUD Testi

```
GET  /api/employees → 2 personel (Ali Usta - 3 hizmet, Mehmet Usta - 2 hizmet)
POST /api/employees {"fullName":"Hasan Usta","serviceIds":[1,2,3]} → ID: 3 oluşturuldu
PUT  /api/employees/3 {"fullName":"Hasan Çelik","serviceIds":[1,3]} → "Personel başarıyla güncellendi."
POST /api/employees/3/services {"serviceIds":[1,2]} → "Hizmetler personele başarıyla atandı."
DEL  /api/employees/3 → "Personel başarıyla silindi (pasife alındı)."
GET  /api/employees/by-service/1 → Ali Usta, Mehmet Usta (saç kesimi yapanlar)
```

### Swagger JSON Doğrulaması

```
Toplam endpoint sayısı: 22 (Swagger JSON'da doğrulandı)
Swagger UI URL: http://localhost:5184/swagger
```
