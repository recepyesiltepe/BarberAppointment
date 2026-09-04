# BarberAppointment — Gün 2: OOP ve SOLID

**Kapsam:** Sınıf/nesne, kapsülleme, soyutlama, kalıtım, çok biçimlilik, arayüz, soyut sınıf, SOLID; arayüz–DI–controller–iş kuralı ayrımı; örnek C# kodları.

Örnekler randevu alanına yakındır; çalıştırılabilir kopya: `samples/BarberAppointment.SolidExamples` (.NET 10).

```bash
dotnet run --project samples/BarberAppointment.SolidExamples
```

---

## 1. OOP temel kavramlar

### 1.1 Sınıf (class) ve nesne (object)

**Sınıf** bir şablon, **nesne** o şablondan üretilmiş somut örnektir.

Kuaför sisteminde `Appointment` sınıfı “randevunun ne olduğu”nu tanımlar; `ahmetinSacKesimi` o sınıfın bir nesnesidir.

```csharp
var randevu = new Appointment(staffId: 3, serviceId: 1, start: DateTime.Today.AddHours(10));
```

Sınıf *tipi* (`Appointment`), nesne *bellekteki örneği*dir.

### 1.2 Kapsülleme (encapsulation)

Veriyi ve o veri üzerinde geçerli işlemleri bir arada tutup, dışarıya kontrollü yüzey açmaktır. Alanlar `private`, kurallar metotlarda kalır.

Örnek: randevu bitiş saati dışarıdan serbest set edilmez; `HizmetSuresi` ile hesaplanır. Böylece “bitiş < başlangıç” gibi tutarsızlık sınıfın içinden zorlaşır.

### 1.3 Soyutlama (abstraction)

Gereksiz detayı gizleyip “ne yapıldığını” öne çıkarmaktır. Müşteri API’si `CreateAppointment` der; SQL, transaction, çakışma sorgusu çağıran tarafa görünmek zorunda değildir.

Soyutlama araçları: arayüz, soyut sınıf, iyi isimlendirilmiş public metotlar.

### 1.4 Kalıtım (inheritance)

Bir sınıfın başka bir sınıfın üyelerini almasıdır (`: Base`). Ortak davranış tek yerde durur.

Risk: derin hiyerarşi kırılgan olur. “Personel bir Kullanıcıdır” her zaman doğru olmayabilir (veri modeli vs. davranış). Gün 1’de personel ve kullanıcı ayrı modüller; kalıtımı zorlamadan ilişki (composition) tercih edilebilir.

### 1.5 Çok biçimlilik (polymorphism)

Aynı mesajın (metot çağrısının) türe göre farklı çalışmasıdır.

```csharp
INotificationSender sender = new SmsNotificationSender();
sender.Send("Randevunuz onaylandı."); // SMS
sender = new EmailNotificationSender();
sender.Send("Randevunuz onaylandı."); // e-posta
```

Çağıran kod `INotificationSender` bilir; somut sınıf değişebilir.

### 1.6 Arayüz (interface)

Sözleşmedir: “bu tipi kullanan, şu üyeleri sağlamak zorunda.” Durum (field) tutmaz (C# 8+ varsayılan metot hariç; örneklerde saf sözleşme kullanılır).

Bir sınıf birden fazla arayüz uygulayabilir. Testte sahte (`fake`) nesne takmak kolaydır.

### 1.7 Soyut sınıf (abstract class)

Hem ortak kod hem zorunlu boşluk (`abstract` metot) taşıyabilir. Doğrudan `new AbstractX()` yapılamaz.

| | Interface | Abstract class |
| :--- | :--- | :--- |
| Çoklu uygulama | Evet | Hayır (tek base class) |
| Ortak kod | Sınırlı (default members) | Doğal |
| IS-A ilişki | Yetenek (“gönderilebilir”) | Tür hiyerarşisi |
| Bu projedeki yer | Servis/repository sözleşmeleri | Ortak entity tabanı (ör. `BaseEntity`) |

---

## 2. SOLID

Beş ilke; amaç esnek, test edilebilir, değişince az yerden kırılan kod.

### 2.1 S — Single Responsibility (Tek sorumluluk)

Bir sınıfın değişme nedeni mümkün olduğunca tek olmalıdır.

- Kötü: `AppointmentService` hem kaydeder, hem e-posta atar, hem fiyat hesaplar, hem log yazar.
- İyi: kayıt `AppointmentService`, bildirim `INotificationSender`, fiyat `IPriceCalculator`.

Örnek: `Srp/`.

### 2.2 O — Open/Closed (Açık/kapalı)

Yeni davranış **eklemeye açık**, mevcut kodu **değiştirmeye kapalı** olmalıdır.

- Kötü: her yeni indirim türünde `if (type == ...)` zincirini şişirmek.
- İyi: `IDiscountPolicy` ve yeni bir sınıf (`StudentDiscountPolicy`); hesaplayıcı değişmez.

Örnek: `Ocp/`.

### 2.3 L — Liskov Substitution (Liskov yerini tutma)

Alt tip, üst tipin yerine **sözleşmeyi bozmadan** geçebilmelidir.

- Kötü: `ReadOnlyAppointmentCalendar : IAppointmentCalendar` iken `Add` fırlatır; çağıran `Add` bekliyorsa kural bozulur.
- İyi: yazma ayrı arayüzde; salt okunur takvim `Add` vaat etmez.

Örnek: `Lsp/`.

### 2.4 I — Interface Segregation (Arayüz ayrımı)

İstemci kullanmadığı metoda bağımlı olmamalıdır. Şişman arayüz zorla boş implementasyon üretir.

- Kötü: `IAppointmentRepository` içinde `Add`, `Delete`, `GetReport`, `ExportExcel`.
- İyi: `IAppointmentReadRepository`, `IAppointmentWriteRepository`; rapor ayrı sözleşme.

Örnek: `Isp/`.

### 2.5 D — Dependency Inversion (Bağımlılığın tersine çevrilmesi)

Üst seviye (iş kuralı) alt seviye detaya (SQL, SMTP) doğrudan bağlanmaz; ikisi de **soyutlamaya** bağlanır.

- Kötü: `AppointmentService` içinde `new SqlAppointmentRepository()`.
- İyi: `AppointmentService(IAppointmentRepository repo)`; WebApi DI ile somut sınıfı bağlar.

Örnek: `Dip/`.

**Not:** D ilkesi “her yere interface koy” demek değildir; kararlı olmayan, değişen veya test edilmesi gereken sınırlara soyutlama konur.

---

## 3. Arayüz, DI, controller, iş kuralı — ayrım

Gün 1 mimarisinde bu dört kavram **farklı katmanlarda** durur.

```
İstemci (web/mobil)
        │  HTTP + JSON
        ▼
Controller (WebApi)     → istek/yanıt, routing, status code
        │  DTO
        ▼
İş kuralı (Services)    → randevu çakışması, süre hesabı, yetki kuralları
        │  interface
        ▼
Repository (Data)       → EF Core, MSSQL
```

### 3.1 Interface (sözleşme)

“Ne yapılacak?” sorusunun cevabıdır; “nasıl?” değildir.

Örnekler:

- `IAppointmentService.CreateAsync(...)`
- `IAppointmentRepository.GetOverlappingAsync(...)`

**Services** arayüzü tanımlar (veya Domain/Core’da paylaşılır); **Data** ve **Services** uygulamayı sağlar. WebApi somut sınıfa değil arayüze bağlanır.

Interface **çalışma zamanında nesne üretmez**; sadece tipi tarif eder.

### 3.2 Dependency Injection (DI)

Eksik bağımlılığı **dışarıdan vermektir**. Constructor injection en yaygınıdır.

```csharp
public class AppointmentsController
{
    private readonly IAppointmentService _appointments;

    public AppointmentsController(IAppointmentService appointments)
    {
        _appointments = appointments;
    }
}
```

ASP.NET Core konteyneri (`Program.cs` / `AddScoped<IAppointmentService, AppointmentService>()`) somut tipi seçer.

| Kavram | Soru |
| :--- | :--- |
| Interface | Hangi metotlar var? |
| DI | Kim, hangi somut sınıfı, ne kadar ömürle verir? (`Singleton` / `Scoped` / `Transient`) |

Interface olmadan da DI yapılır (`AddScoped<AppointmentService>()`); soyutlama olmadan test ve OCP zayıflar. Interface + DI birlikte D ilkesini pratikte uygular.

### 3.3 Controller

HTTP’nin kapısıdır. Görevleri:

- Route ve HTTP fiili (`POST /api/appointments`)
- Gövdeyi DTO’ya bağlamak
- Servisi çağırmak
- HTTP kodu üretmek (`201`, `409`, …)

Controller **iş kuralı yazmaz**: “bu personelde örtüşen randevu var mı?” servistedir. Controller yalnızca çakışma sonucunu `409 Conflict` yapar.

Bu ayrım S ilkesidir: controller’ın değişme nedeni API yüzeyi, servisin değişme nedeni iş kuralıdır.

### 3.4 Business logic (iş kuralı)

Domain’in gerçek kararlarıdır. Bu projedeki örnekler:

- Bitiş = başlangıç + hizmet süresi
- Aynı personelde örtüşen slot yok
- Pasif hizmet/personel ile randevu yok
- Tamamlanmış randevu iptal edilemez

Bunlar **Services** (+ gerekirse Domain metotları) içindedir. EF `SaveChanges` iş kuralı değildir; kalıcı hale getirmektir.

### 3.5 Birlikte nasıl dururlar?

1. Controller, `IAppointmentService` ister (interface + DI).
2. `AppointmentService` çakışmayı hesaplar (iş kuralı).
3. `IAppointmentRepository` ile veri okur/yazar (interface).
4. `EfAppointmentRepository` SQL’i bilir (detay); servis bilmez (D).
5. Yeni bildirim kanalı `INotificationSender` ile eklenir (O); controller değişmez.

---

## 4. Bu çözümde katman eşlemesi

| Kavram | Katman |
| :--- | :--- |
| HTTP, middleware, DI kaydı | WebApi |
| DTO, validasyon, servis arayüzü + uygulama | Services |
| Entity, enum | Domain |
| DbContext, repository, migration | Data |
| Ortak yanıt/hata modeli | Core |

---

## 5. Gün 2 çıktısı

| Çıktı | Konum |
| :--- | :--- |
| Araştırma notu | Bu dosya |
| SRP | `samples/.../Srp` |
| OCP | `samples/.../Ocp` |
| LSP | `samples/.../Lsp` |
| ISP | `samples/.../Isp` |
| DIP | `samples/.../Dip` |
