# Mac’te MSSQL’i yerel çalıştırma

macOS’e SQL Server kurulmaz. Geliştirme için **Docker içinde SQL Server** kullanılır. Bu makine **Apple Silicon (arm64)**; resmi imaj **amd64** olduğu için Docker Desktop’ta **Rosetta emulation** gerekir.

## 1. Docker Desktop

1. [Docker Desktop for Mac – Apple Chip](https://www.docker.com/products/docker-desktop/) indirip kurun.
2. Uygulamayı açın, lisansı kabul edin, yeşil “running” olana kadar bekleyin.
3. **Settings → General**
   - *Use Virtualization framework* açık
   - *Use Rosetta for x86_64/amd64 emulation* açık

Kontrol:

```bash
docker info
```

## 2. Veritabanını ayağa kaldır

Proje kökünden:

```bash
chmod +x database/mssql/up.sh
./database/mssql/up.sh
```

Script konteyneri başlatır, `01`–`03` SQL dosyalarını uygular.

Elle:

```bash
docker compose -f database/docker-compose.yml up -d
```

Hazır olduktan sonra Azure Data Studio veya VS Code MSSQL eklentisi ile bağlanıp `database/mssql/*.sql` dosyalarını çalıştırabilirsiniz.

## 3. Bağlantı bilgisi (yalnızca local)

| Alan | Değer |
| :--- | :--- |
| Server | `localhost,1433` |
| Login | `sa` |
| Password | `BarberApp_Dev1!` |
| Database | `BarberAppointment` |
| Extra | Trust server certificate = yes |

EF Core (sonraki gün) için:

```
Server=localhost,1433;Database=BarberAppointment;User Id=sa;Password=BarberApp_Dev1!;TrustServerCertificate=True;
```

## 4. Durdur / sil

```bash
docker compose -f database/docker-compose.yml stop
docker compose -f database/docker-compose.yml down          # konteyner gider, volume kalır
docker compose -f database/docker-compose.yml down -v       # veri de silinir
```

## 5. Konteyner açılmazsa

Log:

```bash
docker logs barberappointment-sql --tail 100
```

- **AVX / sqlservr crashed** (özellikle macOS 26): `database/docker-compose.yml` içinde image’ı şununla değiştirin:

  `mcr.microsoft.com/mssql/server:2025-CU1-ubuntu-24.04`

- **Docker yok / `docker info` hata**: Desktop açık değil.
- **1433 portu dolu**: compose dosyasında `"1433:1433"` → `"1434:1433"` yapın; bağlantıda `localhost,1434` kullanın.

## 6. Docker istemiyorsanız

- Ücretsiz **Azure SQL Database** oluşturup script’leri orada çalıştırın (firewall’da kendi IP’niz).
- Windows / SQL Server Express kurulu bir makinede `sqlcmd -S localhost -E -i ...` kullanın.

Azure Data Studio: [aka.ms/azuredatastudio](https://aka.ms/azuredatastudio)
