# ==============================================================================
# Aşama 1: Build & Publish (.NET 10 SDK)
# ==============================================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Docker katman önbelleği (layer cache) için öncelikle yalnızca proje dosyalarını kopyala
COPY ["src/libraries/BarberAppointment.Core/BarberAppointment.Core.csproj", "src/libraries/BarberAppointment.Core/"]
COPY ["src/libraries/BarberAppointment.Domain/BarberAppointment.Domain.csproj", "src/libraries/BarberAppointment.Domain/"]
COPY ["src/libraries/BarberAppointment.Data/BarberAppointment.Data.csproj", "src/libraries/BarberAppointment.Data/"]
COPY ["src/libraries/BarberAppointment.Services/BarberAppointment.Services.csproj", "src/libraries/BarberAppointment.Services/"]
COPY ["src/presentation/BarberAppointment.WebApi/BarberAppointment.WebApi.csproj", "src/presentation/BarberAppointment.WebApi/"]

# Bağımlılıkları geri yükle (restore)
RUN dotnet restore "src/presentation/BarberAppointment.WebApi/BarberAppointment.WebApi.csproj"

# Kalan tüm kaynak kodları kopyala
COPY . .

# Web API projesini Release modunda derle ve yayınla
WORKDIR "/src/src/presentation/BarberAppointment.WebApi"
RUN dotnet publish "BarberAppointment.WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==============================================================================
# Aşama 2: Final Runtime (.NET 10 ASP.NET Core Runtime)
# ==============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Varsayılan HTTP portu
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Yayınlanan binary'leri kopyala
COPY --from=build /app/publish .

# Uygulamayı başlat
ENTRYPOINT ["dotnet", "BarberAppointment.WebApi.dll"]

