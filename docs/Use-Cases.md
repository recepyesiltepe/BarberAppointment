# BarberAppointment — Temel Use-Case’ler

Aktörler: **Müşteri**, **Personel**, **Yönetici**, **Sistem**.  
Önkoşullar aksi belirtilmedikçe API’nin ayakta olduğu ve ilgili kaydın veritabanında bulunduğu varsayılır.

---

## UC-01 — Kullanıcı kaydı / oluşturma

| | |
| :--- | :--- |
| **Aktör** | Müşteri veya Yönetici |
| **Amaç** | Sisteme yeni bir kullanıcı eklemek |
| **Önkoşul** | E-posta sistemde kayıtlı değildir |
| **Tetikleyici** | `POST` kullanıcı oluşturma isteği |

**Ana akış**

1. Aktör ad, e-posta, telefon (ve rol, yönetici ise) gönderir.
2. Sistem alanları doğrular.
3. Sistem kullanıcıyı kaydeder.
4. Sistem `201 Created` ve oluşturulan kaydı döner.

**Aykırı akışlar**

- A1: Zorunlu alan eksik / format hatalı → `400`
- A2: E-posta zaten var → `409`

---

## UC-02 — Kullanıcı bilgisi güncelleme

| | |
| :--- | :--- |
| **Aktör** | Müşteri (kendi kaydı) veya Yönetici |
| **Amaç** | Ad, telefon veya iletişim bilgilerini güncellemek |

**Ana akış**

1. Aktör kullanıcı kimliği ve yeni bilgileri gönderir (`PUT`).
2. Sistem kaydı bulur, doğrular, günceller.
3. Sistem `200 OK` döner.

**Aykırı akışlar**

- A1: Kayıt yok → `404`
- A2: Doğrulama hatası → `400`

---

## UC-03 — Personel tanımlama

| | |
| :--- | :--- |
| **Aktör** | Yönetici |
| **Amaç** | Salona yeni personel eklemek |

**Ana akış**

1. Yönetici ad ve (isteğe bağlı) uzmanlık bilgisi gönderir.
2. Sistem personeli aktif olarak kaydeder.
3. Sistem `201 Created` döner.

**Aykırı akış:** doğrulama hatası → `400`

---

## UC-04 — Personele hizmet atama

| | |
| :--- | :--- |
| **Aktör** | Yönetici |
| **Amaç** | Personelin verebileceği hizmetleri belirlemek |

**Ana akış**

1. Yönetici personel kimliği ve hizmet kimlik listesini gönderir.
2. Sistem personel ve hizmetlerin var / aktif olduğunu kontrol eder.
3. Sistem ilişkiyi kaydeder.
4. Sistem `200 OK` döner.

**Aykırı akışlar**

- A1: Personel veya hizmet yok → `404`
- A2: Pasif hizmet atanamaz → `400`

---

## UC-05 — Hizmet tanımlama / güncelleme

| | |
| :--- | :--- |
| **Aktör** | Yönetici |
| **Amaç** | Katalogdaki hizmeti eklemek veya fiyat/süre güncellemek |

**Ana akış**

1. Yönetici ad, süre (dakika), fiyat gönderir veya mevcut kaydı günceller.
2. Sistem kaydeder.
3. Oluşturma `201`, güncelleme `200`.

**Aykırı akış:** süre ≤ 0 veya fiyat < 0 → `400`

---

## UC-06 — Aktif hizmetleri listeleme

| | |
| :--- | :--- |
| **Aktör** | Müşteri, Personel, Yönetici |
| **Amaç** | Randevu alınabilir hizmetleri görmek |

**Ana akış**

1. Aktör `GET` ile hizmet listesini ister.
2. Sistem yalnızca aktif hizmetleri döner (`200`).

---

## UC-07 — Randevu oluşturma

| | |
| :--- | :--- |
| **Aktör** | Müşteri (veya Yönetici müşteri adına) |
| **Amaç** | Belirli personel ve hizmet için slot rezerve etmek |
| **Önkoşul** | Kullanıcı, personel ve hizmet aktif; personel bu hizmeti verebilir |

**Ana akış**

1. Aktör `müşteriId`, `personelId`, `hizmetId`, `başlangıçZamanı` gönderir.
2. Sistem hizmet süresinden bitiş zamanını hesaplar.
3. Sistem geçmiş tarih kontrolü yapar.
4. Sistem personel–hizmet uygunluğunu kontrol eder.
5. Sistem aynı personelde örtüşen randevu olup olmadığını kontrol eder.
6. Sistem durumu `Pending` veya `Confirmed` (MVP: doğrudan `Confirmed` kabul edilebilir) olarak kaydeder.
7. Sistem `201 Created` döner.

**Aykırı akışlar**

- A1: Kaynak yok → `404`
- A2: Pasif kayıt / personel hizmeti vermiyor / geçmiş zaman → `400`
- A3: Zaman çakışması → `409`

---

## UC-08 — Randevuları listeleme

| | |
| :--- | :--- |
| **Aktör** | Müşteri, Personel, Yönetici |
| **Amaç** | Filtreye göre randevuları görmek |

**Ana akış**

1. Aktör isteğe bağlı `userId`, `staffId`, `from`, `to`, `status` ile `GET` yapar.
2. Sistem yetkiye göre filtre uygular (müşteri yalnızca kendisi; personel kendisine atananlar; yönetici tümü).
3. Sistem listeyi `200` ile döner.

---

## UC-09 — Randevu iptali

| | |
| :--- | :--- |
| **Aktör** | Müşteri (kendi randevusu) veya Yönetici |
| **Amaç** | Henüz gerçekleşmemiş randevuyu iptal etmek |

**Ana akış**

1. Aktör randevu kimliği ile iptal ister.
2. Sistem kaydı bulur.
3. Durum `Completed` değilse `Cancelled` yapılır.
4. Sistem `200 OK` döner; ilgili slot boşalır.

**Aykırı akışlar**

- A1: Kayıt yok → `404`
- A2: Zaten iptal / tamamlanmış → `400` veya `409`
- A3: Müşteri başkasının randevusunu iptal edemez → `403` (auth sonrası)

---

## UC-10 — Randevuyu tamamlama

| | |
| :--- | :--- |
| **Aktör** | Yönetici veya Personel |
| **Amaç** | Gerçekleşen randevuyu `Completed` yapmak |

**Ana akış**

1. Aktör randevu kimliği ile tamamlama ister.
2. Sistem durumu `Cancelled` değilse `Completed` yapar.
3. Sistem `200` döner.

**Aykırı akış:** iptal edilmiş randevu tamamlanamaz → `400`

---

## Use-case — modül eşlemesi

| Modül | Use-case |
| :--- | :--- |
| Kullanıcı | UC-01, UC-02 |
| Personel | UC-03, UC-04, UC-08 (personel filtresi) |
| Hizmet | UC-04, UC-05, UC-06 |
| Randevu | UC-07, UC-08, UC-09, UC-10 |
