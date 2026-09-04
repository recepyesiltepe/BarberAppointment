# Gün 14 — React Web Başlangıç ve API/JWT Entegrasyonu

## 1. Genel Bakış ve Amaç

Kuaför Randevu Yönetim Sistemi için **React 19 & Vite** tabanlı, modern dark tema ve altın/amber kuaför renk paletine sahip web uygulaması geliştirilmiştir. ASP.NET Core Web API ile **Stateless JWT Authentication** entegrasyonu tamamlanmıştır.

---

## 2. Araştırılan Konular ve Mimari Tasarım

### 2.1. React Component, Props ve State Yönetimi
- **Component Tabanlı Yapı:** Arayüz; `Navbar`, `LoginScreen`, `DashboardScreen` gibi bağımsız ve tekrar kullanılabilir bileşenlere ayrılmıştır.
- **State Yönetimi (`useState`):** Form girişleri, şifre gizle/göster durumu, aktif sekmeler (`login`/`register`) ve API yüklenme durumları (`loading`) yönetilmiştir.
- **Side Effects (`useEffect`):** Uygulama yüklendiğinde `localStorage` üzerindeki token doğrulanır; hizmetler ve personel listesi arka planda otomatik çekilir.

---

### 2.2. Axios HTTP İstemcisi & Interceptor Mimarisi ([`client.js`](../src/presentation/BarberAppointment.Web/src/api/client.js))

Tüm HTTP istekleri merkezi Axios istemcisi üzerinden yönlendirilir:
1. **Request Interceptor:** `localStorage`'da kayıtlı JWT token varsa isteğin `Authorization: Bearer <token>` başlığına otomatik ekler.
2. **Response Interceptor:**
   - Sunucudan `401 Unauthorized` döndüğünde yerel oturumu otomatik temizler ve kullanıcıyı login durumuna çeker.
   - Standart `ApiResponse` formatındaki hata dizilerini ayıklayarak bileşenlere temiz hata mesajları iletir.

---

### 2.3. Merkezi Auth Context ([`AuthContext.jsx`](../src/presentation/BarberAppointment.Web/src/context/AuthContext.jsx))

Uygulama genelinde oturum durumunu yöneten `AuthProvider`:
- `user`: Kullanıcı ID, Ad Soyad, E-posta, Rol ve Aktiflik durumu
- `token`: Aktif JWT Access Token
- `roleName`: `Admin`, `Employee`, `Customer`
- `isAuthenticated`: Oturum açılmış mı? (boolean)
- `login(email, password)`: API'ye login isteği atar, token ve kullanıcı bilgilerini state/storage'a yazar.
- `register(userData)`: Yeni kullanıcı kaydeder ve otomatik oturum açar.
- `logout()`: Oturumu ve saklanan token'ları temizler.

---

## 3. Geliştirilen Arayüz ve Özellikler

### 3.1. Giriş ve Kayıt Ekranı (`LoginScreen.jsx`)
- **Sekmeli Yapı:** Tek ekranda "Giriş Yap" ve "Kayıt Ol" arasında akıcı geçiş.
- **Hızlı Test Giriş Butonları (Tek Tıkla Demo):**
  - 👑 **Admin:** `superadmin@example.com` / `AdminPassword123!`
  - ✂️ **Personel:** `ali@example.com` / `Password123!`
  - 👤 **Müşteri:** `burak@example.com` / `Password123!`
- **Göz İkonuyla Şifre Göster/Gizle:** Kullanıcı dostu şifre denetimi.
- **Hata ve Başarı Bildirimleri:** Doğrulama hatalarını ve API yanıtlarını canlı gösteren dinamik uyarı kutuları.

---

### 3.2. Yönetim ve Kullanıcı Paneli (`DashboardScreen.jsx`)
- **Kişiselleştirilmiş Karşılama:** *"Hoş Geldiniz, {FullName}!"* ve dinamik rol rozeti.
- **Canlı JWT Token & Claims İnceleme Paneli:**
  - `nameid` (User ID)
  - `email` (E-posta)
  - `role` (Admin / Employee / Customer)
  - Ham JWT Access Token görüntüleme alanı
- **Canlı Hizmetler Kataloğu:** API `/api/services` üzerinden çekilen hizmet adları, süreleri ve fiyatları.
- **Personel Listesi:** API `/api/employees` üzerinden çekilen uzman kadro.

---

## 4. Proje Dizin Yapısı

```
src/presentation/BarberAppointment.Web/
├── index.html                   (Google Fonts: Outfit & Plus Jakarta Sans, Favicon)
├── vite.config.js               (Vite Yapılandırması)
├── package.json                 (React 19, Axios, Lucide React)
└── src/
    ├── api/
    │   ├── client.js            (Axios Interceptor & JWT)
    │   ├── authApi.js           (Login, Register, Me)
    │   └── barberApi.js         (Services, Employees, Appointments)
    ├── components/
    │   ├── Navbar.jsx           (Header, Profil Çipi, Rol Rozeti, Çıkış)
    │   ├── LoginScreen.jsx      (Giriş/Kayıt Formu, Hızlı Test Girişleri)
    │   └── DashboardScreen.jsx  (JWT İnceleyici, Hizmet & Personel Kataloğu)
    ├── context/
    │   └── AuthContext.jsx      (Merkezi Oturum & Yetki State'i)
    ├── index.css                (Altın/Amber Dark Theme Tasarım Sistemi)
    ├── App.jsx                  (Ana Uygulama Düzeni)
    └── main.jsx                 (React Giriş Noktası)
```

---

## 5. Uygulamayı Başlatma

### Backend API'yi Başlatın:
```bash
dotnet run --project src/presentation/BarberAppointment.WebApi --launch-profile http
# API: http://localhost:5184
# Swagger UI: http://localhost:5184/swagger
```

### React Web Uygulamasını Başlatın:
```bash
cd src/presentation/BarberAppointment.Web
npm install
npm run dev -- --port 3000
# Web: http://localhost:3000
```
