# 1. Backend API (Terminal 1)
dotnet run --project src/presentation/BarberAppointment.WebApi --launch-profile http
# API & Swagger: http://localhost:5184/swagger

# 2. React Web Uygulaması (Terminal 2)
cd src/presentation/BarberAppointment.Web
npm run dev -- --port 3000
# Web: http://localhost:3000

# 3. React Native / Expo Mobil Uygulama (Terminal 3)
cd src/presentation/BarberAppointment.Mobile
npm start
# iOS Simulator için: 'i'
# Android Emulator için: 'a'
# Web Önizleme için: 'w'
# Fiziksel Cihaz için: Expo Go ile QR kodu okutun



Demo Hesaplar
👑 Yönetici (Admin)	superadmin@example.com	AdminPassword123!
✂️ Personel (Employee)	ali@example.com	Password123!
👤 Müşteri (Customer)	burak@example.com	Password123!