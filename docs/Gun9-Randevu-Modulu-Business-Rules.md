# Gün 9 — Randevu Modülü & Business Rules Tasarımı

## 1. Genel Bakış ve Amaç

Kuaför Randevu Sistemi'nin en kritik ve iş kuralı yoğun bileşeni **Randevu Modülü (Appointment Module)**'dür. Bu modülde veri bütünlüğü, çakışma engelleme, yetki/uzmanlık doğrulamaları ve çalışma saatleri gibi katı kurallar `AppointmentService` seviyesinde garanti altına alınmıştır.

---

## 2. Tasarlanan ve Uygulanan İş Kuralları (Business Rules)

| Kural Kodu | Kural Tanımı | Kontrol Mekanizması | Hata Yanıtı |
| :--- | :--- | :--- | :--- |
| **BR-01** (FR-R04) | **Geçmiş Zamana Randevu Engeli** | `StartAt < UtcNow - 5dk` | `400 Bad Request` |
| **BR-02** | **Çalışma Saatleri Sınırı** | `StartAt.TimeOfDay < 09:00` veya `EndAt.TimeOfDay > 20:00` | `400 Bad Request` |
| **BR-03** (FR-K03) | **Aktif Müşteri Doğrulaması** | `User == null` veya `!User.IsActive` | `400 Bad Request` |
| **BR-04** (FR-H03) | **Aktif Hizmet Doğrulaması** | `Service == null` veya `!Service.IsActive` | `400 Bad Request` |
| **BR-05** (FR-P03) | **Aktif Personel Doğrulaması** | `Employee == null` veya `!Employee.IsActive` | `400 Bad Request` |
| **BR-06** (FR-R02) | **Personel-Hizmet Yetkinlik Eşleşmesi** | `Employee.EmployeeServices.Any(es => es.ServiceId == dto.ServiceId)` | `400 Bad Request` |
| **BR-07** (FR-H04) | **Otomatik Bitiş Saati Hesaplama** | `EndAt = StartAt.AddMinutes(Service.DurationMinutes)` | Otomatik hesaplanır |
| **BR-08** (FR-R03) | **Personel Randevu Çakışma Engeli** | `StartA < EndB AND EndA > StartB` (İptal edilmemiş randevular) | `409 Conflict` |
| **BR-09** (FR-R06) | **İptal ve Slot Serbest Bırakma** | `Status = Cancelled` yapılarak slot diğer müşterilere açılır | `200 OK` |
| **BR-10** (FR-R07) | **Durum Geçiş Sınırları** | Tamamlanmış veya daha önce iptal edilmiş randevu iptal edilemez | `400 Bad Request` |
| **BR-11** | **Yeniden Zamanlama (Reschedule)** | Randevu saati güncellenirken kendi kaydı hariç tutularak çakışma kontrolü yapılır | `409 Conflict` / `200 OK` |

---

## 3. Randevu Çakışma Algoritması (Overlap Detection)

İki zaman aralığının ($[S_1, E_1]$ ve $[S_2, E_2]$) çakışma (zaman örtüşmesi) koşulu:

$$\text{Çakışma} \iff (S_1 < E_2) \land (E_1 > S_2)$$

### LINQ / EF Core Sorgusu:
```csharp
var hasConflict = await _context.Appointments
    .Where(a => a.EmployeeId == employeeId &&
                a.Status != AppointmentStatus.Cancelled &&
                a.IsActive &&
                startAt < a.EndAt &&
                endAt > a.StartAt &&
                (!excludeAppointmentId.HasValue || a.Id != excludeAppointmentId.Value))
    .AnyAsync(cancellationToken);
```

---

## 4. Randevu Modülü REST API Endpointleri

| HTTP Metod | Endpoint | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/appointments` | Tüm randevuları listeler (ilişkili User, Employee, Service dahil) |
| `GET` | `/api/appointments/filter` | Çok kriterli filtreleme (`employeeId`, `userId`, `status`, `startDate`, `endDate`) |
| `GET` | `/api/appointments/{id}` | Tek bir randevunun detayını getirir |
| `GET` | `/api/appointments/employee/{employeeId}?date=2026-08-28` | Belirli personelin seçilen gündeki randevuları |
| `GET` | `/api/appointments/user/{userId}` | Müşterinin tüm randevu geçmişi |
| `GET` | `/api/appointments/available-slots?employeeId=1&serviceId=1&date=2026-08-28` | Personelin o gün için boş randevu slotlarını döner |
| `POST` | `/api/appointments` | Yeni randevu oluşturur (tüm iş kuralları denetlenir) |
| `PUT` | `/api/appointments/{id}/reschedule` | Randevuyu yeni bir saate taşır |
| `PUT` | `/api/appointments/{id}/cancel` | Randevuyu iptal eder (slot serbest kalır) |
| `PUT` | `/api/appointments/{id}/complete` | Randevuyu tamamlandı olarak işaretler |

---

## 5. Örnek İstek ve Yanıtlar

### 5.1. Boş Slotları Sorgulama (Available Slots)
```http
GET /api/appointments/available-slots?employeeId=1&serviceId=1&date=2026-08-29
```
**Yanıt (200 OK):**
```json
{
  "success": true,
  "message": "2026-08-29 için 20 boş slot bulundu.",
  "data": [
    { "startAt": "2026-08-29T09:00:00", "endAt": "2026-08-29T09:30:00", "durationMinutes": 30 },
    { "startAt": "2026-08-29T09:30:00", "endAt": "2026-08-29T10:00:00", "durationMinutes": 30 },
    { "startAt": "2026-08-29T11:00:00", "endAt": "2026-08-29T11:30:00", "durationMinutes": 30 }
  ],
  "errors": []
}
```

### 5.2. Randevu Oluşturma (Create Appointment)
```http
POST /api/appointments
Content-Type: application/json

{
  "userId": 1,
  "employeeId": 1,
  "serviceId": 1,
  "startAt": "2026-08-29T11:00:00",
  "notes": "Özel saç stili isteği"
}
```
**Yanıt (201 Created):**
```json
{
  "success": true,
  "message": "Randevu başarıyla oluşturuldu.",
  "data": {
    "id": 5,
    "userId": 1,
    "customerName": "Ayşe Demir",
    "customerPhone": "5551112233",
    "employeeId": 1,
    "employeeName": "Ali Usta",
    "serviceId": 1,
    "serviceName": "Saç kesimi",
    "price": 250.00,
    "durationMinutes": 30,
    "startAt": "2026-08-29T11:00:00",
    "endAt": "2026-08-29T11:30:00",
    "status": 2,
    "statusLabel": "Onaylandı",
    "notes": "Özel saç stili isteği",
    "createdAt": "2026-08-25T07:15:00Z"
  },
  "errors": []
}
```

### 5.3. Çakışma Hatası (409 Conflict)
```http
POST /api/appointments
Content-Type: application/json

{
  "userId": 2,
  "employeeId": 1,
  "serviceId": 1,
  "startAt": "2026-08-29T11:15:00",
  "notes": "Çakışan saat"
}
```
**Yanıt (409 Conflict):**
```json
{
  "success": false,
  "message": null,
  "data": null,
  "errors": [
    "'Ali Usta' personelinin 11:15–11:45 saatleri arasında başka bir randevusu bulunmaktadır."
  ]
}
```

---

## 6. Doğrulama ve Test Sonuçları

Aşağıdaki senaryolar otomatik curl komutlarıyla API üzerinde test edilmiş ve başarıyla doğrulanmıştır:

1. ✅ **Geçmiş Tarih Kuralı:** Geçmiş zamana randevu isteği `400 Bad Request` ile engellendi.
2. ✅ **Çalışma Saatleri Kuralı:** 21:00 randevu isteği `400 Bad Request` ile reddedildi.
3. ✅ **Pasif Personel Kuralı:** Pasif durumdaki personele randevu isteği engellendi.
4. ✅ **Pasif Hizmet Kuralı:** Pasif durumdaki hizmet seçildiğinde randevu engellendi.
5. ✅ **Yetkinlik Kuralı:** Personelin vermediği bir hizmet istendiğinde engellendi.
6. ✅ **Çakışma Kontrolü:** Aynı personelin mevcut randevusu ile örtüşen saat için `409 Conflict` üretildi.
7. ✅ **Boş Slot Hesaplama:** Dolu slotlar hariç tutularak günün uygun slotları listelendi.
8. ✅ **Filtreleme:** `employeeId` ve `status` filtreleri doğru sonuçları döndürdü.
9. ✅ **Yeniden Zamanlama (Reschedule):** Randevu saati taşındı ve çakışma durumunda korundu.
10. ✅ **İptal Yaşam Döngüsü:** Randevu iptal edildi; iptal edilen veya tamamlanan randevuların tekrar iptal edilmesi engellendi.
