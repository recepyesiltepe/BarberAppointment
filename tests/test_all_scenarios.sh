#!/bin/bash
set -e

BASE_URL="http://localhost:5184"
PASSED=0
FAILED=0

run_test() {
    local test_name="$1"
    local expected_status="$2"
    local actual_status="$3"

    if [ "$expected_status" -eq "$actual_status" ]; then
        echo "  [PASS] $test_name (HTTP $actual_status)"
        PASSED=$((PASSED + 1))
    else
        echo "  [FAIL] $test_name (Beklenen: HTTP $expected_status, Alınan: HTTP $actual_status)"
        FAILED=$((FAILED + 1))
    fi
}

echo "================================================================"
echo "   BarberAppointment REST API — Gün 13 Kapsamlı Test Koşumu"
echo "================================================================"
echo ""

# 1. AUTH TESTS
echo "--- 1. Auth & Token İşlemleri ---"
# Register
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"E2E Müşteri","email":"e2e.cust@example.com","phone":"5551112233","password":"Password123!","confirmPassword":"Password123!","role":1}')
# 201 or 409 if already registered
if [ "$STATUS" -eq 201 ] || [ "$STATUS" -eq 409 ]; then
    run_test "Customer Registration" 200 200
else
    run_test "Customer Registration" 201 "$STATUS"
fi

# Login
LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"AdminPassword123!"}')
ADMIN_TOKEN=$(echo "$LOGIN_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

CUST_LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"burak@example.com","password":"Password123!"}')
CUST_TOKEN=$(echo "$CUST_LOGIN_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
CUST_ID=$(echo "$CUST_LOGIN_RES" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$ADMIN_TOKEN" ]; then run_test "Admin Login & Token Generation" 200 200; else run_test "Admin Login" 200 500; fi
if [ -n "$CUST_TOKEN" ]; then run_test "Customer Login & Token Generation" 200 200; else run_test "Customer Login" 200 500; fi

# Get Profile /me
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/auth/me")
run_test "GET /api/auth/me (Authorized)" 200 "$STATUS"

echo ""

# 2. PUBLIC ENDPOINTS
echo "--- 2. Public (Anonim) Endpointler ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/services")
run_test "GET /api/services (Public)" 200 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/employees")
run_test "GET /api/employees (Public)" 200 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/appointments/available-slots?employeeId=1&serviceId=1&date=2026-09-05")
run_test "GET /api/appointments/available-slots (Public)" 200 "$STATUS"

echo ""

# 3. ADMIN CRUD OPERATIONS
echo "--- 3. Admin Yönetim Endpointleri ---"
CREATE_SVC_RES=$(curl -s -X POST "$BASE_URL/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Hizmeti","durationMinutes":35,"price":220}')
SVC_ID=$(echo "$CREATE_SVC_RES" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$SVC_ID" ]; then run_test "POST /api/services (Admin Create)" 200 200; else run_test "POST /api/services" 200 500; fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/services/$SVC_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Hizmeti (Güncel)","durationMinutes":40,"price":250,"isActive":true}')
run_test "PUT /api/services/$SVC_ID (Admin Update)" 200 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/services/$SVC_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
run_test "DELETE /api/services/$SVC_ID (Admin Delete)" 200 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/users")
run_test "GET /api/users (Admin Only)" 200 "$STATUS"

echo ""

# 4. APPOINTMENT BUSINESS RULES & LIFECYCLE
echo "--- 4. Randevu İş Mantığı & Yaşam Döngüsü ---"
# Valid Appointment
APPT_RES=$(curl -s -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":'$CUST_ID',"employeeId":1,"serviceId":1,"startAt":"2026-09-10T11:00:00","notes":"E2E Test Randevusu"}')
APPT_ID=$(echo "$APPT_RES" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$APPT_ID" ]; then run_test "POST /api/appointments (Create Success)" 200 200; else run_test "POST /api/appointments" 200 500; fi

# Conflict Check (Overlap)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":'$CUST_ID',"employeeId":1,"serviceId":1,"startAt":"2026-09-10T11:15:00","notes":"Çakışan randevu"}')
run_test "POST /api/appointments (Çakışma Kuralı -> 409 Conflict)" 409 "$STATUS"

# Reschedule
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/appointments/$APPT_ID/reschedule" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startAt":"2026-09-10T15:00:00","notes":"Saat 15:00 olarak güncellendi"}')
run_test "PUT /api/appointments/$APPT_ID/reschedule (Reschedule Success)" 200 "$STATUS"

# Cancel
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/appointments/$APPT_ID/cancel" \
  -H "Authorization: Bearer $CUST_TOKEN")
run_test "PUT /api/appointments/$APPT_ID/cancel (Cancel Success)" 200 "$STATUS"

# Mükerrer İptal Hatası
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/appointments/$APPT_ID/cancel" \
  -H "Authorization: Bearer $CUST_TOKEN")
run_test "PUT /api/appointments/$APPT_ID/cancel (Zaten İptal Edilmiş -> 400)" 400 "$STATUS"

echo ""

# 5. SECURITY & ERROR SCENARIOS
echo "--- 5. Güvenlik ve Hata Senaryoları ---"
# GET /api/appointments/my
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/appointments/my")
run_test "GET /api/appointments/my (Customer Own Appointments -> 200 OK)" 200 "$STATUS"

# 401 Unauthorized
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me")
run_test "GET /api/auth/me (Yetkisiz -> 401 Unauthorized)" 401 "$STATUS"

# 403 Forbidden (Customer accessing Admin route)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/users")
run_test "GET /api/users (Müşteri Yetkisiz -> 403 Forbidden)" 403 "$STATUS"

# 403 Forbidden (Customer accessing another user's appointments)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/appointments/user/999")
run_test "GET /api/appointments/user/999 (Başkasına Ait Randevular -> 403 Forbidden)" 403 "$STATUS"

# 400 Validation Error
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/services" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"","durationMinutes":1,"price":-10}')
run_test "POST /api/services (Geçersiz Model -> 400 Bad Request)" 400 "$STATUS"

# 400 Past Date
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":'$CUST_ID',"employeeId":1,"serviceId":1,"startAt":"2020-01-01T10:00:00"}')
run_test "POST /api/appointments (Geçmiş Tarih -> 400 Bad Request)" 400 "$STATUS"

# 404 Not Found
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/services/99999")
run_test "GET /api/services/99999 (Bulunamadı -> 404 Not Found)" 404 "$STATUS"

# 409 Duplicate Email
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Mükerrer","email":"superadmin@example.com","password":"Password123!","confirmPassword":"Password123!","role":1}')
run_test "POST /api/auth/register (Mükerrer E-posta -> 409 Conflict)" 409 "$STATUS"

# 6. EK GELİŞTİRME 1: E-POSTA GÖNDERİM ALTYAPISI
echo ""
echo "--- 6. Ek Geliştirme 1: E-posta Gönderim Altyapısı (IEmailService) ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/appointments/test-email?toEmail=musteri@example.com")
run_test "POST /api/appointments/test-email (Geçerli E-posta -> 200 OK)" 200 "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/appointments/test-email?toEmail=gecersiz-eposta")
run_test "POST /api/appointments/test-email (Geçersiz E-posta -> 400 Bad Request)" 400 "$STATUS"

# 7. EK GELİŞTİRME 3: SMS DOĞRULAMA ALTYAPISI (ISmsService)
echo ""
echo "--- 7. Ek Geliştirme 3: SMS Doğrulama Altyapısı (ISmsService) ---"

# 7.1 Kod Gönder (Geçerli Numara)
SMS_SEND_RES=$(curl -s -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05559876543"}')
SMS_SEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05557778899"}')
SMS_CODE=$(echo "$SMS_SEND_RES" | grep -o '"simulationCode":"[^"]*' | cut -d'"' -f4)

run_test "POST /api/sms/send-code (Geçerli Telefon -> 200 OK)" 200 "$SMS_SEND_STATUS"

# 7.2 Kod Gönder (Geçersiz Telefon)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"12345"}')
run_test "POST /api/sms/send-code (Geçersiz Telefon -> 400 Bad Request)" 400 "$STATUS"

# 7.3 Cooldown Kontrolü (Aynı Numaraya Peş Peşe İstek)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05559876543"}')
run_test "POST /api/sms/send-code (Cooldown Engeli -> 400 Bad Request)" 400 "$STATUS"

# 7.4 Hatalı Kod ile Doğrulama Denemesi
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05559876543","code":"000000"}')
run_test "POST /api/sms/verify-code (Hatalı Kod -> 400 Bad Request)" 400 "$STATUS"

# 7.5 Doğru Kod ile Başarılı Doğrulama
if [ -n "$SMS_CODE" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-code" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"05559876543","code":"'$SMS_CODE'"}')
  run_test "POST /api/sms/verify-code (Doğru Simülasyon Kodu -> 200 OK)" 200 "$STATUS"
else
  run_test "POST /api/sms/verify-code (Kod Okunamadı)" 200 500
fi

# 7.6 Durum Sorgulama
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/sms/status?phoneNumber=05559876543")
run_test "GET /api/sms/status (Durum Sorgulama -> 200 OK)" 200 "$STATUS"

# 7.7 Giriş Yapmış Kullanıcı Telefon Doğrulama (verify-my-phone)
MY_PHONE_RES=$(curl -s -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05552223344"}')
MY_PHONE_CODE=$(echo "$MY_PHONE_RES" | grep -o '"simulationCode":"[^"]*' | cut -d'"' -f4)

if [ -n "$MY_PHONE_CODE" ] && [ -n "$CUST_TOKEN" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-my-phone" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"05552223344","code":"'$MY_PHONE_CODE'"}')
  run_test "POST /api/sms/verify-my-phone (Kullanıcı Telefon Güncelleme -> 200 OK)" 200 "$STATUS"
fi

echo ""
echo "================================================================"
echo "   Test Sonuçları: $PASSED Başarılı / $FAILED Başarısız"
echo "================================================================"

if [ "$FAILED" -eq 0 ]; then
    echo "🎉 TÜM TESTLER BAŞARIYLA GEÇTİ!"
    exit 0
else
    echo "❌ BAZI TESTLER BAŞARISIZ OLDU."
    exit 1
fi

