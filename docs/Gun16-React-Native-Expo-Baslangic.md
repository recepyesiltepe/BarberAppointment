# Gün 16 — React Native / Expo Başlangıç ve Mobil API Entegrasyonu

## 1. Genel Bakış ve Amaç

Kuaför Randevu Yönetim Sistemi için **React Native & Expo** platformu üzerinde hem iOS hem Android cihazlarda çalışan, modern dark tema ve altın/amber kuaför paletine sahip mobil uygulama geliştirilmiş; ASP.NET Core Web API ile **JWT Authentication ve Domain Veri Entegrasyonu** tamamlanmıştır.

---

## 2. Araştırılan Konular ve Mobil Mimari

### 2.1. React Native Bileşenleri ve Native Davranış
- **Platform Bağımsız Bileşenler:** Web HTML etiketleri (`div`, `span`, `input`) yerine native köprüyü kullanan `View`, `Text`, `TextInput`, `TouchableOpacity`, `ScrollView`, `KeyboardAvoidingView` ve `ActivityIndicator` bileşenleri kullanılmıştır.
- **Klavye Yönetimi (`KeyboardAvoidingView`):** Form doldururken klavyenin giriş alanlarını kapatmaması için iOS ve Android'e özel padding/height davranışı ayarlanmıştır.

---

### 2.2. Mobil Network ve Platform API URL Yönetimi ([`client.js`](../src/presentation/BarberAppointment.Mobile/src/api/client.js))

Mobil cihaz ve emülatörlerin localhost davranışları farklılık gösterir:
- **iOS Simulator / Web:** `http://localhost:5184`
- **Android Emülatörü:** `http://10.0.2.2:5184` (Android sanal makinesi localhost'u kendi içine bağladığı için host makineye 10.0.2.2 ile erişir)
- **Fiziksel Cihaz (Expo Go):** Wi-Fi LAN IP'si (Örn: `http://192.168.1.105:5184`)
- **Dinamik URL Ayarı:** `LoginScreen` üzerinden uygulamanın bağlanacağı API adresi çalışma anında (`runtime`) değiştirilebilir.

---

### 2.3. Mobil Auth Context & Token Yönetimi ([`AuthContext.js`](../src/presentation/BarberAppointment.Mobile/src/context/AuthContext.js))

- `user`, `token`, `roleName`, `isAuthenticated`, `isLoading`, `login`, `register`, `logout` metotları sağlanmıştır.
- `setClientToken(accessToken)` ile Axios interceptor'ına aktif token enjekte edilir ve tüm isteklere `Authorization: Bearer <token>` eklenir.

---

## 3. Geliştirilen Mobil Ekranlar

### 3.1. Giriş ve Kayıt Ekranı ([`LoginScreen.js`](../src/presentation/BarberAppointment.Mobile/src/screens/LoginScreen.js))
- ✂️ **Modern Kuaför Logosu & Başlık**
- **Giriş Yap / Kayıt Ol Sekmeleri:** Akıcı tek ekran geçişi.
- **Tek Tıkla Hızlı Test Giriş Butonları:**
  - 👑 **Admin:** `superadmin@example.com` / `AdminPassword123!`
  - ✂️ **Personel:** `ali@example.com` / `Password123!`
  - 👤 **Müşteri:** `burak@example.com` / `Password123!`
- **Dinamik Sunucu URL Yapılandırması:** Emülatör veya gerçek telefon testleri için API IP'sini kolayca değiştirme alanı.

---

### 3.2. Ana Ekran / Profil Ekranı ([`HomeScreen.js`](../src/presentation/BarberAppointment.Mobile/src/screens/HomeScreen.js))
- **Kişiselleştirilmiş Kullanıcı Kartı:** Avatar, Ad Soyad ve Rol Rozeti (`👑 Yönetici`, `✂️ Personel`, `👤 Müşteri`).
- **Canlı API Durum Göstergesi:** 🟢 `API Bağlantısı: http://localhost:5184`
- **JWT Token & Claims İnceleme Kartı:** Token, User ID, E-Posta ve Rol kodunu mobilde gösteren genişleyebilir kart.
- **Canlı Hizmetler Listesi:** `/api/services` üzerinden çekilen güncel hizmet adları, süreleri ve fiyatları.
- **Uzman Kadro Listesi:** `/api/employees` üzerinden çekilen aktif personel listesi.
- **Çekerek Yenileme (`Pull-to-Refresh`):** Listeyi aşağı çekerek API'den verileri tazeleme.

---

## 4. Mobil Proje Dizin Yapısı

```
src/presentation/BarberAppointment.Mobile/
├── App.js                     (Ana Giriş Noktası & NavigationRoot)
├── app.json                   (Expo Konfigürasyonu)
├── package.json               (Expo SDK 57, React Native 0.86, React 19, Axios)
└── src/
    ├── api/
    │   ├── client.js          (Platform Duyarlı Axios & JWT Interceptor)
    │   └── barberApi.js       (Auth, Services, Employees, Appointments API)
    ├── context/
    │   └── AuthContext.js     (Mobil Oturum & Rol Yönetimi)
    ├── screens/
    │   ├── LoginScreen.js     (Giriş/Kayıt, 1-Tap Demo Girişleri, Sunucu URL Ayarı)
    │   └── HomeScreen.js      (Karşılama, Canlı API Durumu, JWT İnceleyici, Hizmetler/Personel)
    └── theme/
        └── colors.js          (Mobil Altın/Amber Dark Tasarım Paleti)
```

---

## 5. Çalıştırma Talimatları

### 1. Backend API'yi Başlatın:
```bash
dotnet run --project src/presentation/BarberAppointment.WebApi --launch-profile http
# http://localhost:5184
```

### 2. Mobil Uygulamayı Başlatın:
```bash
cd src/presentation/BarberAppointment.Mobile
npm start
```
- **iOS Simulator için:** `i` tuşuna basın veya `npm run ios`
- **Android Emulator için:** `a` tuşuna basın veya `npm run android`
- **Web Önizleme için:** `w` tuşuna basın veya `npm run web`
- **Gerçek Telefon için:** Telefonunuza **Expo Go** uygulamasını yükleyip terminaldeki QR kodu okutun.
