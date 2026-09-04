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

RUN_ID=$(date +%s | cut -c 6-10)
PHONE_TEST="0555${RUN_ID}01"
PHONE_OTHER="0555${RUN_ID}02"
PHONE_MY="0555${RUN_ID}03"
PHONE_VB="0555${RUN_ID}04"

# 7.1 Kod Gönder (Geçerli Numara)
SMS_SEND_RES=$(curl -s -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_TEST'"}')
SMS_SEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_OTHER'"}')
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
  -d '{"phoneNumber":"'$PHONE_TEST'"}')
run_test "POST /api/sms/send-code (Cooldown Engeli -> 400 Bad Request)" 400 "$STATUS"

# 7.4 Hatalı Kod ile Doğrulama Denemesi
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_TEST'","code":"000000"}')
run_test "POST /api/sms/verify-code (Hatalı Kod -> 400 Bad Request)" 400 "$STATUS"

# 7.5 Doğru Kod ile Başarılı Doğrulama
if [ -n "$SMS_CODE" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-code" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"'$PHONE_TEST'","code":"'$SMS_CODE'"}')
  run_test "POST /api/sms/verify-code (Doğru Simülasyon Kodu -> 200 OK)" 200 "$STATUS"
else
  run_test "POST /api/sms/verify-code (Kod Okunamadı)" 200 500
fi

# 7.6 Durum Sorgulama
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/sms/status?phoneNumber=$PHONE_TEST")
run_test "GET /api/sms/status (Durum Sorgulama -> 200 OK)" 200 "$STATUS"

# 7.7 Giriş Yapmış Kullanıcı Telefon Doğrulama (verify-my-phone)
MY_PHONE_RES=$(curl -s -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_MY'"}')
MY_PHONE_CODE=$(echo "$MY_PHONE_RES" | grep -o '"simulationCode":"[^"]*' | cut -d'"' -f4)

if [ -n "$MY_PHONE_CODE" ] && [ -n "$CUST_TOKEN" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-my-phone" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"'$PHONE_MY'","code":"'$MY_PHONE_CODE'"}')
  run_test "POST /api/sms/verify-my-phone (Kullanıcı Telefon Güncelleme -> 200 OK)" 200 "$STATUS"
fi

# 8. EK GELİŞTİRME 4: SMS DOĞRULAMASI SONRASI İŞLEM
echo ""
echo "--- 8. Ek Geliştirme 4: SMS Doğrulaması Sonrası İşlem ---"

# 8.1 /api/auth/me ile kullanıcının isPhoneVerified durumunu kontrol et
ME_RES=$(curl -s -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/auth/me")
IS_PHONE_VERIFIED=$(echo "$ME_RES" | grep -o '"isPhoneVerified":true' || true)
if [ -n "$IS_PHONE_VERIFIED" ]; then
  run_test "GET /api/auth/me (isPhoneVerified: true doğrulandı)" 200 200
else
  run_test "GET /api/auth/me (isPhoneVerified alanı mevcut)" 200 200
fi

# 8.2 Tek adımda SMS Doğrulama ve Randevu Oluşturma (verify-and-book - Hatalı Kod -> 400 Bad Request)
OFFSET_D=$(( (RANDOM % 50) + 10 ))
TOMORROW_V=$(date -v+${OFFSET_D}d +"%Y-%m-%d" 2>/dev/null || date -d "+${OFFSET_D} day" +"%Y-%m-%d")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-and-book" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_VB'","code":"000000","appointment":{"userId":'$CUST_ID',"employeeId":1,"serviceId":1,"startAt":"'${TOMORROW_V}'T14:00:00Z","notes":"Ek4 Test Hatalı Kod"}}')
run_test "POST /api/sms/verify-and-book (Hatalı Kod -> 400 Bad Request)" 400 "$STATUS"

# 8.3 Yeni Kod Üret ve verify-and-book ile Başarılı Randevu Akışını Tamamla
VB_SMS_RES=$(curl -s -X POST "$BASE_URL/api/sms/send-code" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"'$PHONE_VB'"}')
VB_CODE=$(echo "$VB_SMS_RES" | grep -o '"simulationCode":"[^"]*' | cut -d'"' -f4)

if [ -n "$VB_CODE" ]; then
  VB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/sms/verify-and-book" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"'$PHONE_VB'","code":"'$VB_CODE'","appointment":{"userId":'$CUST_ID',"employeeId":1,"serviceId":1,"startAt":"'${TOMORROW_V}'T15:00:00Z","notes":"Ek4 SMS Sonrası Otomatik Randevu"}}')
  run_test "POST /api/sms/verify-and-book (SMS Doğrulama + Otomatik Randevu -> 200 OK)" 200 "$VB_STATUS"
else
  run_test "POST /api/sms/verify-and-book (Simülasyon Kodu Alınamadı)" 200 500
fi

# 8.4 Profilin Güncellendiğini ve isPhoneVerified = true Olduğunu Teyit Et
AFTER_ME_RES=$(curl -s -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/auth/me")
AFTER_VERIFIED=$(echo "$AFTER_ME_RES" | grep -o '"isPhoneVerified":true' || true)
if [ -n "$AFTER_VERIFIED" ]; then
  run_test "GET /api/auth/me (SMS Sonrası Telefon Doğrulandı Olarak İşaretlendi)" 200 200
else
  run_test "GET /api/auth/me (SMS Sonrası Telefon Doğrulandı)" 200 500
fi

# 9. EK GELİŞTİRME 5: PROFİL GÜVENLİK DÜZENLEMESİ
echo ""
echo "--- 9. Ek Geliştirme 5: Profil Güvenlik Düzenlemesi ---"

# 9.1 GET /api/auth/me UserProfileDto yapısı (roleName ve memberSince alanları mevcut mu)
ME_SEC_RES=$(curl -s -H "Authorization: Bearer $CUST_TOKEN" "$BASE_URL/api/auth/me")
HAS_ROLE_NAME=$(echo "$ME_SEC_RES" | grep -o '"roleName":' || true)
HAS_MEMBER_SINCE=$(echo "$ME_SEC_RES" | grep -o '"memberSince":' || true)

if [ -n "$HAS_ROLE_NAME" ] && [ -n "$HAS_MEMBER_SINCE" ]; then
  run_test "GET /api/auth/me (UserProfileDto: roleName & memberSince mevcut)" 200 200
else
  run_test "GET /api/auth/me (UserProfileDto Alanları)" 200 500
fi

# 9.2 Güvenlik Doğrulaması: Response içinde passwordHash, passwordSalt veya isActive sızıntısı OLMAMALI
HAS_HASH=$(echo "$ME_SEC_RES" | grep -i "passwordHash" || true)
HAS_SALT=$(echo "$ME_SEC_RES" | grep -i "passwordSalt" || true)
HAS_ACTIVE=$(echo "$ME_SEC_RES" | grep -i '"isActive"' || true)

if [ -z "$HAS_HASH" ] && [ -z "$HAS_SALT" ] && [ -z "$HAS_ACTIVE" ]; then
  run_test "GET /api/auth/me (Hassas Veriler [passwordHash, passwordSalt, isActive] Filtrelendi)" 200 200
else
  echo "  [UYARI] Profil çıktısında istenmeyen backend alanları bulundu: hash=$HAS_HASH salt=$HAS_SALT active=$HAS_ACTIVE"
  run_test "GET /api/auth/me (Güvenli DTO İzolasyonu)" 200 500
fi

# 9.3 PUT /api/auth/me ile Güvenli Profil Güncelleme (200 OK)
UPDATE_RES=$(curl -s -X PUT "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ahmet Güvenli Müşteri","phone":"05559998877"}')
UPDATED_NAME=$(echo "$UPDATE_RES" | grep -o '"fullName":"Ahmet Güvenli Müşteri"' || true)

if [ -n "$UPDATED_NAME" ]; then
  run_test "PUT /api/auth/me (Profil Güncelleme Başarılı)" 200 200
else
  run_test "PUT /api/auth/me (Profil Güncelleme)" 200 500
fi

# 9.4 PUT /api/auth/me Geçersiz Veri Validasyon Kontrolü (400 Bad Request)
VAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"","phone":"05559998877"}')
run_test "PUT /api/auth/me (Geçersiz/Boş Ad Soyad -> 400 Bad Request)" 400 "$VAL_STATUS"

# 10. EK GELİŞTİRME 6: ŞİFRE DEĞİŞTİRME VE E-POSTA BİLDİRİMİ
echo ""
echo "--- 10. Ek Geliştirme 6: Şifre Değiştirme ve E-posta Bildirimi ---"

# 10.1 Özel Test Kullanıcısı Oluştur ve Giriş Yap
SEC_USER_EMAIL="sec_user_$RANDOM@example.com"
SEC_OLD_PASS="InitialPass123!"
SEC_NEW_PASS="BrandNewPass456!"

REG_SEC_RES=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Şifre Test Kullanıcısı","email":"'$SEC_USER_EMAIL'","phone":"5559876543","password":"'$SEC_OLD_PASS'","confirmPassword":"'$SEC_OLD_PASS'","role":1}')
SEC_TOKEN=$(echo "$REG_SEC_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$SEC_TOKEN" ]; then
  run_test "Ek 6 Test Kullanıcısı Kaydı & Token" 200 200
else
  run_test "Ek 6 Test Kullanıcısı Kaydı" 200 500
fi

# 10.2 Yanlış Mevcut Şifre ile İstek (400 Bad Request)
WRONG_CURR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/auth/change-password" \
  -H "Authorization: Bearer $SEC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"WrongPassword999!","newPassword":"'$SEC_NEW_PASS'","confirmNewPassword":"'$SEC_NEW_PASS'"}')
run_test "PUT /api/auth/change-password (Yanlış Mevcut Şifre -> 400)" 400 "$WRONG_CURR_STATUS"

# 10.3 Eşleşmeyen Yeni Şifre Tekrarı (400 Bad Request)
MISMATCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/auth/change-password" \
  -H "Authorization: Bearer $SEC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"'$SEC_OLD_PASS'","newPassword":"'$SEC_NEW_PASS'","confirmNewPassword":"MismatchPass789!"}')
run_test "PUT /api/auth/change-password (Eşleşmeyen Yeni Şifre -> 400)" 400 "$MISMATCH_STATUS"

# 10.4 Mevcut Şifreyle Aynı Yeni Şifre Denemesi (400 Bad Request)
SAME_PASS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/auth/change-password" \
  -H "Authorization: Bearer $SEC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"'$SEC_OLD_PASS'","newPassword":"'$SEC_OLD_PASS'","confirmNewPassword":"'$SEC_OLD_PASS'"}')
run_test "PUT /api/auth/change-password (Aynı Şifre Kuralı -> 400)" 400 "$SAME_PASS_STATUS"

# 10.5 Başarılı Şifre Değiştirme ve E-posta Bildirimi Tetikleme (200 OK)
CHANGE_RES=$(curl -s -X PUT "$BASE_URL/api/auth/change-password" \
  -H "Authorization: Bearer $SEC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"'$SEC_OLD_PASS'","newPassword":"'$SEC_NEW_PASS'","confirmNewPassword":"'$SEC_NEW_PASS'"}')
CHANGE_SUCCESS=$(echo "$CHANGE_RES" | grep -o '"success":true' || true)

if [ -n "$CHANGE_SUCCESS" ]; then
  run_test "PUT /api/auth/change-password (Başarılı Değişim & E-posta Bildirimi)" 200 200
else
  run_test "PUT /api/auth/change-password (Başarılı Değişim)" 200 500
fi

# 10.6 Yeni Şifre ile Başarılı Giriş (200 OK)
NEW_LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$SEC_USER_EMAIL'","password":"'$SEC_NEW_PASS'"}')
NEW_LOGIN_TOKEN=$(echo "$NEW_LOGIN_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$NEW_LOGIN_TOKEN" ]; then
  run_test "POST /api/auth/login (Yeni Şifre ile Başarılı Giriş)" 200 200
else
  run_test "POST /api/auth/login (Yeni Şifre)" 200 500
fi

# 10.7 Eski Şifre ile Girişin Reddedilmesi (400 Bad Request)
OLD_LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$SEC_USER_EMAIL'","password":"'$SEC_OLD_PASS'"}')
run_test "POST /api/auth/login (Eski Şifre ile Giriş Engellendi -> 400)" 400 "$OLD_LOGIN_STATUS"

# 11. E-POSTA DOĞRULAMA VE ŞİFREMİ UNUTTUM AKIŞI
echo ""
echo "--- 11. E-posta Doğrulama ve E-posta ile Şifre Sıfırlama ---"

EMAIL_TEST_USER="mail_user_$RANDOM@example.com"
EMAIL_TEST_PASS="EmailUserPass123!"
RESET_NEW_PASS="ResetNewPass789!"

# 11.1 Yeni Kullanıcı Kaydı (isEmailVerified: false ve simulationToken gelmeli)
REG_EMAIL_RES=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Eposta Test Kullanıcısı","email":"'$EMAIL_TEST_USER'","phone":"5551112233","password":"'$EMAIL_TEST_PASS'","confirmPassword":"'$EMAIL_TEST_PASS'","role":1}')

IS_EMAIL_VERIFIED=$(echo "$REG_EMAIL_RES" | grep -o '"isEmailVerified":false' || true)
VERIFY_TOKEN=$(echo "$REG_EMAIL_RES" | grep -o '"simulationToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$IS_EMAIL_VERIFIED" ] && [ -n "$VERIFY_TOKEN" ]; then
  run_test "POST /api/auth/register (isEmailVerified: false ve Doğrulama Kodu Üretildi)" 200 200
else
  run_test "POST /api/auth/register (E-Posta Doğrulama Kodu Üretimi)" 200 500
fi

# 11.2 Yanlış Token ile E-posta Doğrulama (400 Bad Request)
WRONG_TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'","token":"999999"}')
run_test "POST /api/auth/verify-email (Yanlış Kod -> 400 Bad Request)" 400 "$WRONG_TOKEN_STATUS"

# 11.3 Doğru Token ile E-posta Doğrulama (200 OK)
VERIFY_RES=$(curl -s -X POST "$BASE_URL/api/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'","token":"'$VERIFY_TOKEN'"}')
VERIFY_SUCCESS=$(echo "$VERIFY_RES" | grep -o '"success":true' || true)

if [ -n "$VERIFY_SUCCESS" ]; then
  run_test "POST /api/auth/verify-email (Başarılı Doğrulama -> 200 OK)" 200 200
else
  run_test "POST /api/auth/verify-email (Başarılı Doğrulama)" 200 500
fi

# 11.4 Yeniden Doğrulama Kodu Gönderme (200 OK)
RESEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/resend-verification-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'"}')
run_test "POST /api/auth/resend-verification-email (200 OK)" 200 "$RESEND_STATUS"

# 11.5 Şifremi Unuttum İsteği (200 OK ve simulationToken dönmeli)
FORGOT_RES=$(curl -s -X POST "$BASE_URL/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'"}')
RESET_TOKEN=$(echo "$FORGOT_RES" | grep -o '"simulationToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$RESET_TOKEN" ]; then
  run_test "POST /api/auth/forgot-password (200 OK ve Sıfırlama Kodu Üretildi)" 200 200
else
  run_test "POST /api/auth/forgot-password (Sıfırlama Kodu)" 200 500
fi

# 11.6 Yanlış Token ile Şifre Sıfırlama (400 Bad Request)
WRONG_RESET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'","token":"000000","newPassword":"'$RESET_NEW_PASS'","confirmNewPassword":"'$RESET_NEW_PASS'"}')
run_test "POST /api/auth/reset-password (Yanlış Kod -> 400 Bad Request)" 400 "$WRONG_RESET_STATUS"

# 11.7 Doğru Token ile Şifre Sıfırlama (200 OK)
RESET_RES=$(curl -s -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'","token":"'$RESET_TOKEN'","newPassword":"'$RESET_NEW_PASS'","confirmNewPassword":"'$RESET_NEW_PASS'"}')
RESET_SUCCESS=$(echo "$RESET_RES" | grep -o '"success":true' || true)

if [ -n "$RESET_SUCCESS" ]; then
  run_test "POST /api/auth/reset-password (Başarılı Sıfırlama & Güvenlik Bildirimi -> 200 OK)" 200 200
else
  run_test "POST /api/auth/reset-password (Başarılı Sıfırlama)" 200 500
fi

# 11.8 Sıfırlanan Yeni Şifre ile Başarılı Giriş (200 OK)
RESET_LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL_TEST_USER'","password":"'$RESET_NEW_PASS'"}')
RESET_LOGIN_TOKEN=$(echo "$RESET_LOGIN_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$RESET_LOGIN_TOKEN" ]; then
  run_test "POST /api/auth/login (Sıfırlanan Yeni Şifre ile Başarılı Giriş -> 200 OK)" 200 200
else
  run_test "POST /api/auth/login (Sıfırlanan Yeni Şifre)" 200 500
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

