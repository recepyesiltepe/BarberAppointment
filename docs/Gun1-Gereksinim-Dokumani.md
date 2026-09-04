# BarberAppointment — Gün 1 Gereksinim Dokümanı

**Proje:** BarberAppointment (Kuaför Randevu Sistemi)  
**Kapsam:** REST API temelleri, gereksinim çıkarımı, temel modüller ve use-case’ler  
**Hedef istemciler:** Web ve mobil uygulamalar (aynı API’yi tüketir)

---

## 1. Projenin amacı

Basit bir kuaför randevu sistemi için **ASP.NET Core REST API** geliştirilecektir. API, web ve mobil istemcilere hizmet verir; tarayıcı veya uygulama arayüzü bu belgenin kapsamı dışındadır.

Öğrenme ve uygulama hedefleri:

- Nesne yönelimli programlama (OOP)
- SOLID ilkeleri
- Katmanlı mimari
- Dependency Injection (DI)
- Repository Pattern
- Entity Framework Core
- MSSQL
- Git

Yapay zekâ araçları araştırma ve geliştirmede kullanılabilir; üretilen kodun ne işe yaradığı ve hangi problemi çözdüğü açıklanabilir olmalıdır.

---

## 2. Mimari özet

Çözüm klasör yapısı:

```
BarberAppointment/
└── src/
    ├── libraries/
    │   ├── BarberAppointment.Core
    │   ├── BarberAppointment.Domain
    │   ├── BarberAppointment.Data
    │   └── BarberAppointment.Services
    └── presentation/
        └── BarberAppointment.WebApi
```

| Katman | Sorumluluk |
| :--- | :--- |
| **Core** | Ortak modeller, standart API yanıt yapıları, istisnalar, sabitler, yardımcılar |
| **Domain** | Entity’ler, enum’lar, temel domain modelleri |
| **Data** | DbContext, EF Core konfigürasyonları, repository uygulamaları, migration’lar, veritabanı işlemleri |
| **Services** | İş kuralları, DTO’lar, doğrulama, servis arayüzleri ve uygulamaları |
| **WebApi** | Controller’lar, middleware, kimlik doğrulama, API yapılandırması, DI kayıtları |

---

## 3. Temel varsayımlar (MVP)

Belgede aksi yazılmadığı sürece aşağıdaki varsayımlar geçerlidir:

- Tek bir işletme (tek salon) yönetilir.
- Randevu, **bir personel + bir hizmet + bir müşteri + tarih/saat** birleşimidir.
- Çakışan randevu (aynı personel, örtüşen zaman dilimi) kabul edilmez.
- İptal edilen randevu slot’u yeniden açılabilir.
- Kimlik doğrulama (JWT vb.) sonraki günlerde eklenir; Gün 1’de roller ve yetkiler **iş kuralı** olarak tanımlanır.

---

## 4. Aktörler

| Aktör | Açıklama |
| :--- | :--- |
| **Müşteri (Kullanıcı)** | Hizmetleri ve uygun saatleri görür, randevu alır, kendi randevularını listeler/iptal eder. |
| **Personel** | Kendisine atanan randevuları görür; çalışma kapsamı hizmet ve randevu takvimine bağlıdır. |
| **Yönetici (Admin)** | Personel, hizmet ve (gerekirse) tüm randevuları yönetir. |
| **Sistem** | Çakışma kontrolü, durum geçişleri, standart HTTP/JSON yanıtları. |

---

## 5. Modüller

### 5.1 Kullanıcı (User)

Müşteri ve yönetici hesapları. Temel alanlar: ad, e-posta, telefon, rol, aktiflik.

**Yetenekler:** kayıt / oluşturma, listeleme, detay, güncelleme, pasife alma.

### 5.2 Personel (Personnel / Staff)

Salonda hizmet veren çalışanlar. Temel alanlar: ad, unvan/uzmanlık, aktiflik, verdiği hizmetler.

**Yetenekler:** personel CRUD, personele hizmet atama, personelin randevu takvimini görüntüleme.

### 5.3 Hizmet (Service)

Saç kesimi, sakal tıraşı vb. Temel alanlar: ad, süre (dakika), fiyat, aktiflik.

**Yetenekler:** hizmet CRUD, aktif hizmetleri listeleme (randevu oluştururken yalnızca aktif hizmetler).

### 5.4 Randevu (Appointment)

Rezervasyon kaydı. Temel alanlar: müşteri, personel, hizmet, başlangıç zamanı, bitiş zamanı (hizmet süresinden türetilir), durum.

**Durumlar (öneri):** `Pending`, `Confirmed`, `Completed`, `Cancelled`.

**Yetenekler:** randevu oluşturma, listeleme (müşteri / personel / tarih filtresi), detay, iptal, (yönetici) tamamlama veya durum güncelleme.

---

## 6. Fonksiyonel gereksinimler

### FR-K — Kullanıcı

| ID | Gereksinim |
| :--- | :--- |
| FR-K01 | Sistem, e-posta ile benzersiz kullanıcı kaydı tutar. |
| FR-K02 | Kullanıcı adı, e-posta ve telefon bilgileri güncellenebilir. |
| FR-K03 | Kullanıcı pasife alınabilir; pasif kullanıcı yeni randevu oluşturamaz. |
| FR-K04 | Kullanıcılar role göre ayrılır: `Customer`, `Staff`, `Admin` (personel kaydı ile eşleşme sonraki katmanlarda netleştirilir). |

### FR-P — Personel

| ID | Gereksinim |
| :--- | :--- |
| FR-P01 | Yönetici personel ekleyebilir, güncelleyebilir, pasife alabilir. |
| FR-P02 | Personel bir veya daha fazla hizmet verebilir. |
| FR-P03 | Pasif personel için yeni randevu oluşturulamaz. |
| FR-P04 | Personelin belirli bir gün/aralıktaki randevuları listelenebilir. |

### FR-H — Hizmet

| ID | Gereksinim |
| :--- | :--- |
| FR-H01 | Yönetici hizmet tanımlayabilir (ad, süre, fiyat). |
| FR-H02 | Hizmet güncellenebilir ve pasife alınabilir. |
| FR-H03 | Randevu yalnızca aktif hizmet için oluşturulur. |
| FR-H04 | Randevu bitiş zamanı, başlangıç + hizmet süresi ile hesaplanır. |

### FR-R — Randevu

| ID | Gereksinim |
| :--- | :--- |
| FR-R01 | Müşteri; personel, hizmet ve başlangıç zamanı seçerek randevu oluşturur. |
| FR-R02 | Seçilen personel, seçilen hizmeti verebiliyor olmalıdır. |
| FR-R03 | Aynı personelin örtüşen zaman aralığında ikinci randevusu oluşturulamaz. |
| FR-R04 | Geçmiş bir zamana randevu oluşturulamaz. |
| FR-R05 | Müşteri yalnızca kendi randevularını listeler / iptal eder (yönetici tümünü görür). |
| FR-R06 | İptal edilen randevu tekrar `Cancelled` dışına alınmaz; slot boşalır. |
| FR-R07 | Tamamlanan randevu iptal edilemez. |

---

## 7. Fonksiyonel olmayan gereksinimler

| ID | Gereksinim |
| :--- | :--- |
| NFR-01 | API, REST ilkelerine uygun kaynak tabanlı uç noktalar sunar (`GET/POST/PUT/DELETE`). |
| NFR-02 | İstek ve yanıt gövdesi JSON’dur. |
| NFR-03 | HTTP durum kodları semantik kullanılır (aşağıdaki tablo). |
| NFR-04 | API, Swagger (OpenAPI) ile belgelenir; Postman ile test edilebilir. |
| NFR-05 | Veri MSSQL’de tutulur; erişim EF Core + repository üzerinden yapılır. |
| NFR-06 | Katmanlar birbirinin sorumluluğuna girmez (WebApi iş kuralı yazmaz, Domain DbContext bilmez). |
| NFR-07 | Hata yanıtları ortak bir yapıda döner (Core katmanı). |

### 7.1 HTTP durum kodları (hedef)

| Kod | Kullanım |
| :--- | :--- |
| 200 OK | Başarılı okuma / güncelleme |
| 201 Created | Kaynak oluşturuldu |
| 204 No Content | Başarılı silme / gövdesiz işlem (MVP’de soft-delete tercih edilebilir) |
| 400 Bad Request | Doğrulama hatası, geçersiz gövde |
| 401 Unauthorized | Kimlik yok / geçersiz (auth eklendiğinde) |
| 403 Forbidden | Yetkisiz işlem |
| 404 Not Found | Kaynak yok |
| 409 Conflict | Randevu çakışması, e-posta tekrarı |
| 500 Internal Server Error | Beklenmeyen sunucu hatası |

---

## 8. Kullanıcı senaryoları (özet)

1. **Yeni müşteri randevu alır:** Aktif hizmetleri görür, personel seçer, uygun saati seçer, randevu oluşur.
2. **Müşteri randevusunu iptal eder:** Kendi kaydını bulur, henüz tamamlanmamışsa iptal eder.
3. **Yönetici hizmet ekler:** Yeni hizmet (süre + fiyat) tanımlar; müşteriler listede görür.
4. **Yönetici personel tanımlar:** Personele hizmet atar; o personel yalnızca atanan hizmetler için seçilebilir.
5. **Personel gününü planlar:** Kendi randevu listesini tarihe göre görür.
6. **Çakışma reddedilir:** Aynı usta, örtüşen saatte ikinci kayıt 409 ile reddedilir.
7. **Pasif hizmet/personel:** Randevu oluşturma bu kayıtlarla yapılamaz.

---

## 9. REST kaynak taslağı (sonraki günler)

| Kaynak | Örnek uç noktalar |
| :--- | :--- |
| Kullanıcılar | `GET/POST /api/users`, `GET/PUT /api/users/{id}` |
| Personel | `GET/POST /api/staff`, `GET/PUT /api/staff/{id}` |
| Hizmetler | `GET/POST /api/services`, `GET/PUT /api/services/{id}` |
| Randevular | `GET/POST /api/appointments`, `GET /api/appointments/{id}`, `PUT /api/appointments/{id}/cancel` |

İstemci–sunucu: tarayıcı/mobil **istemci**, WebApi **sunucu**. İstemci durumu sunucuda tutulmaz; her istek kendi başına anlamlıdır (REST).

---

## 10. Kapsam dışı (MVP)

- Çok şubeli işletme
- Online ödeme
- SMS / e-posta bildirimi
- Personel vardiya / mola takvimi (ileride eklenebilir)
- Puanlama ve yorum
- Web/mobil UI uygulaması

---

## 11. Gün 1 çıktısı

- Bu gereksinim dokümanı
- Temel use-case’ler: [Use-Cases.md](./Use-Cases.md)
