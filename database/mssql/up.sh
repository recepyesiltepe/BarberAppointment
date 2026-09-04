#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.yml"
PASSWORD="${MSSQL_SA_PASSWORD:-BarberApp_Dev1!}"
CONTAINER="barberappointment-sql"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker bulunamadı. Önce Docker Desktop (Apple Chip) kurun:"
  echo "  https://www.docker.com/products/docker-desktop/"
  echo "Ardından Settings > General: Virtualization framework"
  echo "Settings > General: Use Rosetta for x86_64/amd64 emulation"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker kurulu ama çalışmıyor. Docker Desktop uygulamasını açıp yeşil olmasını bekleyin."
  exit 1
fi

echo "SQL Server konteyneri başlatılıyor..."
docker compose -f "$COMPOSE_FILE" up -d

sqlcmd_in_container() {
  local tools18="/opt/mssql-tools18/bin/sqlcmd"
  local tools="/opt/mssql-tools/bin/sqlcmd"
  if docker exec "$CONTAINER" test -x "$tools18"; then
    docker exec "$CONTAINER" "$tools18" -C -S localhost -U sa -P "$PASSWORD" "$@"
  elif docker exec "$CONTAINER" test -x "$tools"; then
    docker exec "$CONTAINER" "$tools" -S localhost -U sa -P "$PASSWORD" "$@"
  else
    echo "Konteynerde sqlcmd yok; T-SQL dosyalarını Azure Data Studio ile çalıştırın."
    return 1
  fi
}

echo "SQL Server hazır olana kadar bekleniyor..."
for i in $(seq 1 40); do
  if sqlcmd_in_container -Q "SELECT 1" -b -o /dev/null >/dev/null 2>&1; then
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "SQL Server ayağa kalkmadı. Log:"
    docker logs "$CONTAINER" --tail 80
    echo
    echo "Apple Silicon: Docker Desktop'ta Rosetta emulation açık olsun."
    echo "macOS 26 + AVX hatası: image'ı 2025-CU1 yapın (docs/Gun3-MSSQL-Yerel-Kurulum.md)."
    exit 1
  fi
  sleep 3
done

echo "Şema ve örnek veri uygulanıyor..."
sqlcmd_in_container -i /scripts/01_create_database.sql
sqlcmd_in_container -d BarberAppointment -i /scripts/02_schema.sql
sqlcmd_in_container -d BarberAppointment -i /scripts/03_seed.sql

echo
echo "Tamam. Bağlantı:"
echo "  Server:   localhost,1433"
echo "  User:     sa"
echo "  Password: $PASSWORD"
echo "  Database: BarberAppointment"
echo
echo "Örnek JOIN:"
echo "  docker exec -it $CONTAINER /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P '$PASSWORD' -d BarberAppointment -i /scripts/04_sample_joins.sql"
