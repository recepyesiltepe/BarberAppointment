# Ek Geliştirme 7: Karanlık / Aydınlık Mod (Light & Dark Theme) Desteği

Bu doküman, Kuaför Randevu Yönetim Sistemi'nin **Ek Geliştirme 7 (Karanlık / Aydınlık Mod)** özelliğinin mimari tasarımını, CSS değişken hiyerarşisini, işletim sistemi/tarayıcı tercihi senkronizasyonunu (`prefers-color-scheme`), Web ve Mobil istemci entegrasyonlarını ve derleme/test sonuçlarını kapsamlı bir şekilde açıklar.

---

## 1. Genel Bakış ve Amaç

Modern web ve mobil uygulamalarda kullanıcı deneyiminin (UX) ve göz konforunun artırılması amacıyla karanlık (Dark) ve aydınlık (Light) tema desteği gereklidir.

Bu geliştirme ile sağlanan temel kazanımlar:
1. **Varsayılan Olarak Sistem Tercihi Takibi:** Kullanıcı herhangi bir seçim yapmadığında varsayılan ayar **"Sistem (Otomatik)"** olarak çalışır. Tarayıcı ve işletim sisteminin `prefers-color-scheme` (macOS, Windows, iOS, Android) ayarı okunur.
2. **Dinamik ve Anlık Senkronizasyon:** Sistem modu aktifken kullanıcının işletim sistemi düzeyinde açık/koyu mod değiştirmesi durumunda (`window.matchMedia` / `Appearance.addChangeListener`), sayfa yenilenmesine gerek kalmadan tema anında ve akıcı bir animasyonla güncellenir.
3. **Kullanıcı Tercihi ile Üzerine Yazma (Override):** Kullanıcı, üst gezinme çubuğundaki (Navbar) 3'lü geçiş düğmesinden veya Profil ekranından **Sistem**, **Açık** veya **Koyu** tercihlerinden birini seçerek varsayılan davranışı ezebilir.
4. **Kalıcı Saklama (Persistence):** Seçilen tercih Web platformunda `localStorage` (`barber_theme_preference`), Mobil platformda ise depolama alanında saklanır; oturum kapansa veya sayfa yenilense dahi korunur.
5. **Yüksek Kontrast ve Erişilebilirlik:** Aydınlık mod için özel olarak seçilen yüzey (`#f8fafc`), kart (`#ffffff`), kenarlık (`rgba(0,0,0,0.08)`) ve metin (`#0f172a`, `#475569`) renkleri ile WCAG uyumlu yüksek okunabilirlik sağlanmıştır.

---

## 2. Mimari Tasarım & Tema Durum Akışı

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            TEMA YÖNETİMİ & SENKRONİZASYON AKIŞI                             │
│                                                                                             │
│                [ localStorage: 'barber_theme_preference' ]                                 │
│                                      │                                                      │
│                                      ▼                                                      │
│                         ┌──────────────────────────┐                                        │
│                         │ themePreference kontrolü │                                        │
│                         └────────────┬─────────────┘                                        │
│                                      │                                                      │
│               ┌──────────────────────┴──────────────────────┐                               │
│               ▼                                             ▼                               │
│     [ 'light' veya 'dark' ]                            [ 'system' ]                         │
│               │                                             │                               │
│   (Manuel Tercih Öncelikli)                    (İşletim Sistemi Tercihi)                    │
│               │                                             │                               │
│               │                                ┌────────────┴────────────┐                  │
│               │                                ▼                         ▼                  │
│               │                         prefers: dark             prefers: light            │
│               │                                │                         │                  │
│               │                                ▼                         ▼                  │
│               │                           'dark' tema               'light' tema            │
│               │                                │                         │                  │
│               └────────────────────────┬───────┴─────────────────────────┘                  │
│                                        ▼                                                    │
│                       [ resolvedTheme ('dark' / 'light') ]                                  │
│                                        │                                                    │
│                        ┌───────────────┴───────────────┐                                    │
│                        ▼                               ▼                                    │
│             [ document.documentElement ]     [ React Native Context ]                       │
│             data-theme="dark"|"light"        colors (darkColors/lightColors)                │
│                        │                               │                                    │
│                        ▼                               ▼                                    │
│             CSS Değişkenleri Aktif           Mobil Ekranlar & StatusBar                     │
│             (Anında Akıcı Geçiş)             Dinamik Renk Değişimi                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Web Uygulaması (`BarberAppointment.Web`)

### 3.1. `ThemeContext.jsx`

`src/presentation/BarberAppointment.Web/src/context/ThemeContext.jsx` dosyası:
- `themePreference`: `'system' | 'light' | 'dark'` durumunu yönetir.
- `window.matchMedia('(prefers-color-scheme: dark)')` dinleyicisini kurarak OS tema değişikliklerinde `resolvedTheme`'i tetikler.
- Seçim değiştiğinde `document.documentElement.setAttribute('data-theme', resolvedTheme)` ataması yapar ve tercihi `localStorage`'a yazar.

### 3.2. `index.css` Değişken Mimarisi

Koyu ve açık tema stilleri CSS değişkenleri üzerinden modüler hale getirilmiştir:

```css
:root, [data-theme="dark"] {
  --bg-main: #0a0d14;
  --bg-card: rgba(17, 24, 39, 0.75);
  --bg-card-solid: #111827;
  --bg-card-hover: rgba(31, 41, 55, 0.85);
  --bg-input: rgba(15, 23, 42, 0.6);
  --header-bg: rgba(10, 13, 20, 0.85);
  --modal-overlay: rgba(0, 0, 0, 0.75);
  --modal-footer-bg: rgba(15, 23, 42, 0.5);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.16);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --btn-secondary-bg: rgba(255, 255, 255, 0.06);
  color-scheme: dark;
}

[data-theme="light"] {
  --bg-main: #f8fafc;
  --bg-card: rgba(255, 255, 255, 0.88);
  --bg-card-solid: #ffffff;
  --bg-card-hover: #f1f5f9;
  --bg-input: #ffffff;
  --header-bg: rgba(255, 255, 255, 0.9);
  --modal-overlay: rgba(15, 23, 42, 0.45);
  --modal-footer-bg: #f8fafc;
  --border-subtle: rgba(0, 0, 0, 0.08);
  --border-medium: rgba(0, 0, 0, 0.15);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --btn-secondary-bg: rgba(0, 0, 0, 0.05);
  color-scheme: light;
}
```

### 3.3. Gezinme Çubuğu (`Navbar.jsx`) & Tema Değiştirici

Üst barda oturum açmış veya açmamış tüm kullanıcılara hitap eden 3'lü segmented kontrol entegre edilmiştir:
- 🖥️ **Oto (Sistem):** İşletim sistemi temasını takip eder.
- ☀️ **Açık (Light):** Aydınlık temayı sabitler.
- 🌙 **Koyu (Dark):** Karanlık temayı sabitler.

### 3.4. Profil Modalı (`UserProfileModal.jsx`)

Kullanıcı profilinde "Görünüm & Tema Tercihi" kartı eklenmiş; aktif tema durumu ve açıklama metinleri ile kullanıcıya detaylı tercih seçeneği sağlanmıştır.

---

## 4. Mobil Uygulama (`BarberAppointment.Mobile`)

### 4.1. `colors.js` Renk Paleti

`darkColors` ve `lightColors` olmak üzere iki tam teşekküllü renk haritası tanımlanmış; geriye uyumluluk için `colors` objesi ve `getThemeColors(theme)` fonksiyonu dışa aktarılmıştır.

### 4.2. `ThemeContext.js`

- React Native'in `Appearance.getColorScheme()` ve `Appearance.addChangeListener` API'leri entegre edilmiştir.
- `useTheme()` hook'u ile mobil bileşenler aktif renk paletine (`colors`), `isDark` bayrağına ve `setThemePreference` metoduna kolayca erişir.

### 4.3. `App.js` & `ProfileScreen.js`

- `App.js` kökü `ThemeProvider` ile sarmalanmış; `StatusBar` `light` / `dark` durumuna göre otomatik uyarlanmıştır.
- `ProfileScreen.js` içerisine **🎨 Tema & Görünüm Tercihi** kartı yerleştirilmiş ve Sistem, Açık ve Koyu butonları ile tam işlevsel hale getirilmiştir.

---

## 5. Karşılaştırmalı Renk Paleti Tablosu

| Bileşen / Rol | Koyu Tema (Dark) | Açık Tema (Light) |
|---|---|---|
| Ana Sayfa Zemin (`--bg-main`) | `#0a0d14` (Derin Gece) | `#f8fafc` (Açık Gri / Slate 50) |
| Kart / Panel Yüzeyi (`--bg-card`) | `rgba(17, 24, 39, 0.75)` | `rgba(255, 255, 255, 0.88)` |
| Kart Katı Zemin (`--bg-card-solid`) | `#111827` (Slate 900) | `#ffffff` (Saf Beyaz) |
| Girdi Alanları (`--bg-input`) | `rgba(15, 23, 42, 0.6)` | `#ffffff` (Saf Beyaz) |
| Üst Bar Zemin (`--header-bg`) | `rgba(10, 13, 20, 0.85)` | `rgba(255, 255, 255, 0.90)` |
| Birincil Metin (`--text-primary`) | `#f8fafc` (Açık Beyaz) | `#0f172a` (Koyu Lacivert / Slate 900) |
| İkincil Metin (`--text-secondary`) | `#94a3b8` (Slate 400) | `#475569` (Slate 600) |
| Kenarlıklar (`--border-subtle`) | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.08)` |
| Vurgu Rengi (Barber Gold) | `#f59e0b` / `#fbbf24` | `#d97706` / `#f59e0b` |

---

## 6. Doğrulama ve Test Sonuçları

1. **Web Derlemesi (Vite):**
   ```bash
   npm --prefix src/presentation/BarberAppointment.Web run build
   # Sonuç: ✓ built in 256ms (0 hata)
   ```
2. **Mobil İhracatı (Expo Metro Bundler):**
   ```bash
   cd src/presentation/BarberAppointment.Mobile && EXPO_NO_TELEMETRY=1 npx expo export --output-dir dist
   # Sonuç: Web, iOS ve Android paketleri 0 hata ile derlendi ve ihraç edildi.
   ```
3. **Mevcut Senaryo Testleri (48 Test):**
   ```bash
   bash tests/test_all_scenarios.sh
   # Sonuç: Test Sonuçları: 48 Başarılı / 0 Başarısız
   # 🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!
   ```

