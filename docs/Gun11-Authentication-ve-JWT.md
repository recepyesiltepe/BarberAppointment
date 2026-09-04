# Gün 11 — Authentication ve JWT (JSON Web Token)

## 1. Araştırılan Konular

### 1.1. Authentication (Kimlik Doğrulama) vs Authorization (Yetkilendirme)

| Kavram | Soru | Açıklama | Projedeki Karşılığı |
| :--- | :--- | :--- | :--- |
| **Authentication (Kimlik Doğrulama)** | *"Sen kimsin?"* | Kullanıcının sunduğu kimlik bilgilerini (e-posta & şifre) doğrulayıp sisteme kabul etme sürecidir. | `POST /api/auth/login`, `POST /api/auth/register`, JWT Token üretimi |
| **Authorization (Yetkilendirme)** | *"Neler yapmaya yetkin var?"* | Kimliği doğrulanmış kullanıcının belirli kaynaklara veya işlemlere erişim hakkını denetleme sürecidir. | `[Authorize(Roles = Roles.Admin)]`, `[Authorize(Roles = Roles.Employee)]` |

---

### 1.2. JSON Web Token (JWT) Yapısı ve Stateless Mimari

JWT, taraflar arasında güvenli bilgi aktarımı sağlayan kompakt ve URL-güvenli bir standarttır (RFC 7519).

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF5xZ9lIERlbWlyIiwicm9sZSI6IkN1c3RvbWVyIn0.4flgK...
└────────────────┬──────────────────┘ └─────────────────────────┬─────────────────────────┘ └──────────────┬──────────────┘
             1. HEADER                                      2. PAYLOAD                                  3. SIGNATURE
```

1. **Header (Başlık):** Token tipi (`JWT`) ve kullanılan imzalama algoritması (`HS256`).
2. **Payload (Gövde / Claims):** Kullanıcıya ait iddialar:
   - `nameid` (User ID)
   - `email` (E-posta)
   - `unique_name` (Ad Soyad)
   - `role` (Admin / Customer / Employee)
   - `exp` (Son geçerlilik zamanı - UTC)
   - `iss` / `aud` (Yayıncı / Alıcı)
3. **Signature (İmza):** Header ve Payload'ın gizli anahtar (`Secret Key`) ile şifrelenmiş özeti. Sunucu gelen istekte token'ı veritabanına sormadan matematiksel olarak doğrular (**Stateless - Durumsuz**).

---

### 1.3. Şifre Güvenliği: Password Hashing ve Salt (Tuzlama)

Düz metin (`plain text`) şifre saklamak kabul edilemez bir güvenlik açığıdır. Sistemimizde **HMAC-SHA512** algoritması kullanılmıştır:

$$\text{PasswordHash} = \text{HMAC-SHA512}(\text{Password}, \text{PasswordSalt})$$

- **Salt (Tuz - 128 Byte):** Her kullanıcı için kriptografik olarak rastgele üretilir. Bu sayede aynı şifreye sahip iki kullanıcının hash değerleri birbirinden tamamen farklı olur (Gökkuşağı / Rainbow Tablosu saldırılarına karşı koruma).
- **Hash (Özet - 64 Byte):** Şifre ve salt birleştirilerek tek yönlü özet üretilir.
- **Timing Attack Koruması:** Şifre doğrulaması `CryptographicOperations.FixedTimeEquals` metoduyla yapılarak zamanlama analizine dayalı saldırılar önlenir.

---

### 1.4. Rol Tabanlı Yetkilendirme Matrisi (RBAC)

| Modül / İşlem | Endpoint | Anonim | Customer | Employee | Admin |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Kayıt / Giriş** | `POST /api/auth/register`, `login` | ✅ | ✅ | ✅ | ✅ |
| **Profilim** | `GET /api/auth/me`, `change-password` | ❌ | ✅ | ✅ | ✅ |
| **Hizmet Listesi** | `GET /api/services` | ✅ | ✅ | ✅ | ✅ |
| **Hizmet Yönetimi** | `POST, PUT, DELETE /api/services` | ❌ | ❌ | ❌ | ✅ |
| **Personel Listesi** | `GET /api/employees` | ✅ | ✅ | ✅ | ✅ |
| **Personel Yönetimi** | `POST, PUT, DELETE /api/employees` | ❌ | ❌ | ❌ | ✅ |
| **Boş Slot Sorgulama** | `GET /api/appointments/available-slots` | ✅ | ✅ | ✅ | ✅ |
| **Randevu Alma** | `POST /api/appointments` | ❌ | ✅ | ✅ | ✅ |
| **Randevu İptali** | `PUT /api/appointments/{id}/cancel` | ❌ | ✅ | ✅ | ✅ |
| **Tüm Randevular** | `GET /api/appointments` | ❌ | ❌ | ✅ | ✅ |
| **Randevu Tamamlama** | `PUT /api/appointments/{id}/complete` | ❌ | ❌ | ✅ | ✅ |
| **Kullanıcı Listesi** | `GET /api/users` | ❌ | ❌ | ❌ | ✅ |

---

## 2. Geliştirilen Bileşenler

```
BarberAppointment/
├── src/libraries/BarberAppointment.Services/
│   ├── Security/
│   │   ├── IPasswordHasher.cs & PasswordHasher.cs   (HMAC-SHA512 Kripto Servisi)
│   │   └── IJwtTokenService.cs & JwtTokenService.cs (JWT Üretim & Claims Yönetimi)
│   ├── DTOs/
│   │   └── AuthDto.cs                                (RegisterDto, LoginDto, AuthResponseDto)
│   ├── Validators/
│   │   └── AuthValidators.cs                         (FluentValidation Kuralları)
│   └── Implementations/
│       └── AuthService.cs                            (IAuthService Implementasyonu)
└── src/presentation/BarberAppointment.WebApi/
    ├── Controllers/
    │   └── AuthController.cs                         (Register, Login, Me, ChangePassword)
    └── Program.cs                                    (AddJwtBearer & Swagger Bearer Yapılandırması)
```

---

## 3. Örnek İstek ve Yanıtlar

### 3.1. Kayıt Olma (`POST /api/auth/register`)
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Burak Yılmaz",
  "email": "burak@example.com",
  "phone": "5553334455",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "role": 1
}
```
**Yanıt (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Kullanıcı kaydı başarıyla oluşturuldu.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "user": {
      "id": 4,
      "fullName": "Burak Yılmaz",
      "email": "burak@example.com",
      "phone": "5553334455",
      "role": 1,
      "isActive": true
    }
  },
  "errors": [],
  "timestamp": "2026-08-25T07:14:36Z"
}
```

### 3.2. Giriş Yapma (`POST /api/auth/login`)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "burak@example.com",
  "password": "Password123!"
}
```
**Yanıt (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Giriş başarılı.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "user": { ... }
  },
  "errors": [],
  "timestamp": "2026-08-25T07:14:36Z"
}
```

### 3.3. Yetkili Profil Sorgulama (`GET /api/auth/me`)
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...
```
**Yanıt (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": null,
  "data": {
    "id": 4,
    "fullName": "Burak Yılmaz",
    "email": "burak@example.com",
    "role": 1,
    "isActive": true
  },
  "errors": [],
  "timestamp": "2026-08-25T07:14:36Z"
}
```

### 3.4. Yetkisiz ve Yasaklı İstek Örnekleri
- **Token Gönderilmediğinde:** `401 Unauthorized` (`WWW-Authenticate: Bearer`)
- **Customer Token ile Admin Endpoint'i (`GET /api/users`):** `403 Forbidden`
- **Yanlış Şifre:** `400 Bad Request` (`{"errors": ["E-posta adresi veya şifre hatalı."]}`)

---

## 4. Swagger UI ile JWT Test Rehberi

1. `http://localhost:5184/swagger` adresine gidin.
2. `POST /api/Auth/login` endpoint'ini kullanarak bir token alın (veya `/register` ile yeni kullanıcı oluşturun).
3. JSON yanıtındaki `accessToken` değerini kopyalayın.
4. Swagger sayfasının sağ üst köşesindeki **Authorize (kilit ikonu)** butonuna tıklayın.
5. Değer alanına `Bearer <KOPYALANAN_TOKEN>` veya doğrudan `<TOKEN>` yazıp **Authorize** butonuna tıklayın.
6. Artık kilitli tüm endpoint'leri test edebilirsiniz.
