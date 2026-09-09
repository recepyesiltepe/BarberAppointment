import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { barberApi, smsApi } from '../api/barberApi';
import { formatTurkishPhone, isValidTurkishPhone, normalizeTurkishPhone } from '../utils/phoneUtils';

export const BookingScreen = ({ onBookingComplete, onCancelFlow }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, updateUser } = useAuth();

  // Wizard Step: 1 = Service, 2 = Employee, 3 = Date & Slot, 4 = Review / Success
  const [currentStep, setCurrentStep] = useState(1);

  // Data States
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);

  // Selected Booking State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
  const [selectedSlot, setSelectedSlot] = useState(null); // { startAt, endAt, durationMinutes }
  const [notes, setNotes] = useState('');

  // Result State
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // SMS Verification Flow States (Ek Geliştirme 4)
  const [smsPhone, setSmsPhone] = useState(user?.phone ? formatTurkishPhone(user.phone) : '0555 333 44 55');
  const [smsCode, setSmsCode] = useState('');
  const [smsStep, setSmsStep] = useState(1); // 1 = Phone Input, 2 = Code Input
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [simulationCode, setSimulationCode] = useState(null);
  const [smsError, setSmsError] = useState(null);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (smsCooldown > 0) {
      timer = setInterval(() => {
        setSmsCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [smsCooldown]);

  useEffect(() => {
    if (user?.phone) {
      setSmsPhone(formatTurkishPhone(user.phone));
    }
  }, [user]);

  const handleSendSmsCode = async () => {
    if (!smsPhone || !isValidTurkishPhone(smsPhone)) {
      setSmsError('Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0555 123 45 67).');
      return;
    }

    setSmsLoading(true);
    setSmsError(null);
    try {
      const normPhone = normalizeTurkishPhone(smsPhone);
      const res = await smsApi.sendCode(normPhone);
      if (res.success && res.data) {
        setSmsCooldown(res.data.cooldownSeconds || 60);
        if (res.data.simulationCode) {
          setSimulationCode(res.data.simulationCode);
        }
        setSmsStep(2);
        Alert.alert('SMS Gönderildi', `Doğrulama kodu ${res.data.maskedPhoneNumber || smsPhone} numarasına gönderildi.`);
      } else {
        setSmsError(res.message || 'SMS kodu gönderilemedi.');
      }
    } catch (err) {
      setSmsError(err.message || 'SMS gönderim hatası.');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleVerifyAndBook = async () => {
    if (!smsCode || smsCode.trim().length !== 6) {
      setSmsError('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    setLoading(true);
    setSmsError(null);
    try {
      const appointmentPayload = {
        userId: user?.id || 1,
        employeeId: selectedEmployee.id,
        serviceId: selectedService.id,
        startAt: selectedSlot.startAt,
        notes: notes || null
      };

      const normPhone = normalizeTurkishPhone(smsPhone);
      const res = await smsApi.verifyAndBook(normPhone, smsCode.trim(), appointmentPayload);
      if (res.success && res.data) {
        if (updateUser) {
          updateUser({ isPhoneVerified: true, phone: normPhone });
        }
        setCreatedAppointment(res.data.appointment);
        setCurrentStep(5);
        Alert.alert('Tebrikler 🎉', 'Telefonunuz doğrulandı ve randevunuz başarıyla oluşturuldu!');
      } else {
        setSmsError(res.message || 'Doğrulama veya randevu oluşturma başarısız.');
      }
    } catch (err) {
      setSmsError(err.message || 'Randevu işlemi gerçekleştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  // Gelecek 7 günün tarih listesini üret
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : d.toLocaleDateString('tr-TR', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('tr-TR', { month: 'short' });
      dates.push({ iso, dayName, dayNum, monthName });
    }
    return dates;
  };

  const datesList = getNext7Days();

  // 1. Adım: Hizmetleri Yükle
  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const res = await barberApi.getServices();
        if (res.success) {
          setServices(res.data || []);
        }
      } catch (err) {
        setError('Hizmetler yüklenemedi: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  // Hizmet seçildiğinde personelleri yükle ve 2. Adıma geç
  const handleSelectService = async (service) => {
    setSelectedService(service);
    setSelectedEmployee(null);
    setSelectedSlot(null);
    setError(null);
    setLoading(true);

    try {
      // Hizmeti verebilen personelleri getir
      const res = await barberApi.getEmployeesByService(service.id).catch(() => barberApi.getEmployees());
      if (res.success && res.data && res.data.length > 0) {
        setEmployees(res.data);
      } else {
        // Fallback tüm aktif personeller
        const fallback = await barberApi.getEmployees();
        setEmployees(fallback.data || []);
      }
      setCurrentStep(2);
    } catch (err) {
      setError('Personeller getirilemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Personel seçildiğinde 3. Adıma geç ve ilk tarihi seç
  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setSelectedSlot(null);
    setError(null);
    const initialDate = datesList[0].iso;
    setSelectedDate(initialDate);
    fetchSlots(employee.id, selectedService.id, initialDate);
    setCurrentStep(3);
  };

  // Boş Slotları Getir
  const fetchSlots = async (employeeId, serviceId, date) => {
    setLoadingSlots(true);
    setError(null);
    try {
      const res = await barberApi.getAvailableSlots(employeeId, serviceId, date);
      if (res.success) {
        setAvailableSlots(res.data || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      setError('Boş saatler alınırken hata: ' + err.message);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (dateIso) => {
    setSelectedDate(dateIso);
    setSelectedSlot(null);
    if (selectedEmployee && selectedService) {
      fetchSlots(selectedEmployee.id, selectedService.id, dateIso);
    }
  };

  // Randevuyu Onayla ve Gönder (4. Adım)
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedService || !selectedEmployee) {
      setError('Lütfen tüm seçimleri tamamlayınız.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appointmentPayload = {
        userId: user?.id || 1,
        employeeId: selectedEmployee.id,
        serviceId: selectedService.id,
        startAt: selectedSlot.startAt,
        notes: notes || null
      };

      const res = await barberApi.createAppointment(appointmentPayload);
      if (res.success && res.data) {
        setCreatedAppointment(res.data);
        setCurrentStep(5); // Success State
      } else {
        throw new Error(res.message || 'Randevu oluşturulamadı.');
      }
    } catch (err) {
      setError(err.message || 'Randevu alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Formatlayıcılar
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHuman = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        currentStep === 5 && styles.scrollContentSuccess
      ]}
    >
      {/* Step Indicator Header */}
      {currentStep < 5 && (
        <View style={styles.stepHeader}>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]}>
              <Text style={[styles.stepDotNum, currentStep >= 1 && styles.stepDotNumActive]}>1</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]}>
              <Text style={[styles.stepDotNum, currentStep >= 2 && styles.stepDotNumActive]}>2</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
            <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive]}>
              <Text style={[styles.stepDotNum, currentStep >= 3 && styles.stepDotNumActive]}>3</Text>
            </View>
            <View style={[styles.stepLine, currentStep >= 4 && styles.stepLineActive]} />
            <View style={[styles.stepDot, currentStep >= 4 && styles.stepDotActive]}>
              <Text style={[styles.stepDotNum, currentStep >= 4 && styles.stepDotNumActive]}>4</Text>
            </View>
          </View>
          <Text style={styles.stepTitle}>
            {currentStep === 1 && '1. Adım: Hizmetinizi Seçin'}
            {currentStep === 2 && '2. Adım: Kuaförünüzü Seçin'}
            {currentStep === 3 && '3. Adım: Tarih ve Saat Seçin'}
            {currentStep === 4 && '4. Adım: Randevu Özeti ve Onay'}
          </Text>
        </View>
      )}

      {/* Error Alert Box */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* ─── STEP 1: HİZMET SEÇİMİ ────────────────────────────────────────── */}
      {currentStep === 1 && (
        <View>
          <Text style={styles.instruction}>Size uygun bakım veya tıraş hizmetini seçin:</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : (
            services.map((srv) => (
              <TouchableOpacity
                key={srv.id}
                style={[
                  styles.card,
                  selectedService?.id === srv.id && styles.cardSelected
                ]}
                onPress={() => handleSelectService(srv)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{srv.name}</Text>
                  <Text style={styles.cardSub}>⏱ Süre: {srv.durationMinutes} dakika</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>{srv.price} ₺</Text>
                  <Text style={styles.arrowText}>İleri ›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* ─── STEP 2: PERSONEL SEÇİMİ ──────────────────────────────────────── */}
      {currentStep === 2 && (
        <View>
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedBannerText}>
              ✂️ Seçilen Hizmet: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{selectedService?.name}</Text> ({selectedService?.price} ₺)
            </Text>
          </View>

          <Text style={styles.instruction}>İşleminizi yapacak uzman personeli seçin:</Text>

          {loading ? (
            <View style={{ alignItems: 'center', marginVertical: 30 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>Personeller yükleniyor...</Text>
            </View>
          ) : (
            employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.card,
                  selectedEmployee?.id === emp.id && styles.cardSelected
                ]}
                onPress={() => handleSelectEmployee(emp)}
                activeOpacity={0.75}
              >
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffAvatarText}>{emp.fullName?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{emp.fullName}</Text>
                  <Text style={[styles.cardSub, { color: colors.info }]}>{emp.title || 'Usta Kuaför'}</Text>
                </View>
                <Text style={styles.arrowText}>Seç ›</Text>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ Hizmet Seçimine Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── STEP 3: TARİH VE SAAT SEÇİMİ ─────────────────────────────────── */}
      {currentStep === 3 && (
        <View>
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedBannerText}>
              ✂️ {selectedService?.name} • 👤 {selectedEmployee?.fullName}
            </Text>
          </View>

          {/* Tarih Seçici Chips */}
          <Text style={styles.instruction}>Randevu Günü:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {datesList.map((d) => {
              const isSelected = selectedDate === d.iso;
              return (
                <TouchableOpacity
                  key={d.iso}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => handleDateChange(d.iso)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                    {d.dayName}
                  </Text>
                  <Text style={[styles.dateChipNum, isSelected && styles.dateChipTextActive]}>
                    {d.dayNum}
                  </Text>
                  <Text style={[styles.dateChipMonth, isSelected && styles.dateChipTextActive]}>
                    {d.monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Saat Dilimleri */}
          <Text style={[styles.instruction, { marginTop: 20 }]}>
            Müsait Randevu Saatleri ({availableSlots.length} Boş Slot):
          </Text>

          {loadingSlots ? (
            <View style={{ alignItems: 'center', marginVertical: 30 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>Müsait saatler taranıyor...</Text>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.emptySlotsCard}>
              <Text style={styles.emptySlotsText}>
                ⚠️ Seçilen tarihte personelin uygun boş saati bulunamadı. Lütfen başka bir gün veya personel seçiniz.
              </Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot, idx) => {
                const isSelected = selectedSlot?.startAt === slot.startAt;
                const timeLabel = formatTime(slot.startAt);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.slotChip, isSelected && styles.slotChipActive]}
                    onPress={() => {
                      setSelectedSlot(slot);
                      setCurrentStep(4);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                      {timeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(2)}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ Personel Seçimine Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── STEP 4: ÖZET VE ONAY ─────────────────────────────────────────── */}
      {currentStep === 4 && (
        <View>
          <Text style={styles.instruction}>Randevu bilgilerinizi kontrol edip onaylayın:</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeading}>📋 Randevu Özeti</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hizmet:</Text>
              <Text style={styles.summaryVal}>{selectedService?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hizmet Süresi:</Text>
              <Text style={styles.summaryVal}>{selectedService?.durationMinutes} Dakika</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Personel:</Text>
              <Text style={[styles.summaryVal, { color: colors.info }]}>{selectedEmployee?.fullName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tarih:</Text>
              <Text style={styles.summaryVal}>{formatDateHuman(selectedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Saat:</Text>
              <Text style={[styles.summaryVal, { color: colors.primaryLight, fontWeight: '700' }]}>
                {formatTime(selectedSlot?.startAt)} - {formatTime(selectedSlot?.endAt)}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Toplam Tutar:</Text>
              <Text style={[styles.summaryVal, { color: colors.primary, fontSize: 18, fontWeight: '800' }]}>
                {selectedService?.price} ₺
              </Text>
            </View>
          </View>

          {/* Not Ekleme */}
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Randevu Notu (İsteğe Bağlı)</Text>
            <TextInput
              style={[styles.input, { minHeight: 65, textAlignVertical: 'top' }]}
              placeholder="Örn: Özel saç modeli veya sakal detayı"
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          {/* Phone Verification Section: Telefon onaylanmış olsa dahi yeni randevularda onay kodu zorunludur */}
          {user?.isPhoneVerified && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.3)',
              borderRadius: 10,
              marginBottom: 12
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>🛡️</Text>
                <View>
                  <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>Kayıtlı Numara: {user?.phone || ''}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Yeni randevunuz için SMS onay kodu gereklidir</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>✓ Onaylı</Text>
              </View>
            </View>
          )}

          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 18 }}>📱</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                SMS Telefon Doğrulaması (Gerekli)
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 16 }}>
              Randevu güvenliği için cep telefonunuza tek kullanımlık doğrulama kodu gönderilecektir. Kodu doğruladığınızda randevunuz <Text style={{ fontWeight: '700', color: colors.primary }}>otomatik olarak tamamlanacaktır</Text>.
            </Text>

            {smsError && (
              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                <Text style={{ color: '#fca5a5', fontSize: 12 }}>⚠️ {smsError}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, height: 44, marginVertical: 0 }]}
                placeholder="0555 123 45 67"
                placeholderTextColor={colors.textMuted}
                value={smsPhone}
                onChangeText={(val) => setSmsPhone(formatTurkishPhone(val))}
                keyboardType="phone-pad"
                maxLength={14}
                editable={!(smsStep === 2 && smsCooldown > 0)}
              />

              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  height: 44,
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={handleSendSmsCode}
                disabled={smsLoading || smsCooldown > 0}
                activeOpacity={0.75}
              >
                {smsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                    {smsCooldown > 0 ? `${smsCooldown}s` : smsStep === 2 ? 'Yeniden İste' : 'Kod Gönder'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {smsStep === 2 && (
              <View style={{ marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' }}>
                {simulationCode && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                      borderRadius: 8,
                      padding: 8,
                      marginBottom: 10
                    }}
                    onPress={() => setSmsCode(simulationCode)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#7dd3fc', fontSize: 12 }}>🧪 Test Kodu: <Text style={{ fontWeight: '800' }}>{simulationCode}</Text></Text>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>Kodu Doldur ↵</Text>
                  </TouchableOpacity>
                )}

                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>6 Haneli Kodu Giriniz:</Text>
                <TextInput
                  style={[styles.input, { height: 44, fontSize: 18, fontWeight: '800', letterSpacing: 6, textAlign: 'center', marginVertical: 0, marginBottom: 12 }]}
                  placeholder="123456"
                  placeholderTextColor={colors.textMuted}
                  value={smsCode}
                  onChangeText={(val) => setSmsCode(val.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <TouchableOpacity
                  style={[styles.confirmButton, { height: 46, backgroundColor: colors.primary, marginTop: 4 }, (loading || smsCode.length !== 6) && { opacity: 0.6 }]}
                  onPress={handleVerifyAndBook}
                  disabled={loading || smsCode.length !== 6}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#000" />
                      <Text style={[styles.confirmButtonText, { fontSize: 13 }]}>Doğrulanıyor & Randevu Alınıyor...</Text>
                    </View>
                  ) : (
                    <Text style={[styles.confirmButtonText, { fontSize: 13 }]}>✓ Doğrula ve Randevuyu Otomatik Tamamla</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {smsStep === 1 ? (
            <TouchableOpacity
              style={[styles.confirmButton, smsLoading && { opacity: 0.8 }]}
              onPress={handleSendSmsCode}
              disabled={smsLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>SMS Kodu İsteyerek Devam Et</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(3)}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ Saat Seçimine Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── STEP 5: TEBRİKLER & BAŞARI EKRANI ────────────────────────────── */}
      {currentStep === 5 && (
        <View style={styles.successCard}>
          <View style={styles.successIconBadge}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
          </View>

          <Text style={styles.successTitle}>Randevunuz Onaylandı!</Text>
          <Text style={styles.successSub}>
            Randevu kaydınız başarıyla oluşturuldu. Salonumuzda sizi ağırlamaktan mutluluk duyacağız.
          </Text>

          <View style={styles.ticketBox}>
            <View style={styles.ticketRowItem}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Hizmet:</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{createdAppointment?.serviceName}</Text>
            </View>
            <View style={styles.ticketRowItem}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Personel:</Text>
              <Text style={{ color: colors.info, fontWeight: '700', fontSize: 14 }}>{createdAppointment?.employeeName}</Text>
            </View>
            <View style={[styles.ticketRowItem, { borderBottomWidth: 0 }]}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Zaman:</Text>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                {new Date(createdAppointment?.startAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {formatTime(createdAppointment?.startAt)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => {
              if (onBookingComplete) onBookingComplete();
            }}
          >
            <Text style={styles.confirmButtonText}>📅 Randevularımı Görüntüle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backButton, { marginTop: 12 }]}
            onPress={() => {
              setCurrentStep(1);
              setSelectedService(null);
              setSelectedEmployee(null);
              setSelectedSlot(null);
              setCreatedAppointment(null);
            }}
          >
            <Text style={styles.backButtonText}>+ Yeni Randevu Al</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  scrollContentSuccess: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  stepHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotNum: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepDotNumActive: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  instruction: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    color: colors.primaryLight,
    fontSize: 16,
    fontWeight: '800',
  },
  arrowText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  selectedBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  selectedBannerText: {
    color: colors.primaryLight,
    fontSize: 13,
  },
  dateScroll: {
    marginBottom: 10,
  },
  dateChip: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginRight: 10,
    minWidth: 70,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipDay: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  dateChipNum: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 2,
  },
  dateChipMonth: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  dateChipTextActive: {
    color: '#000000',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  slotChip: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: '28%',
    alignItems: 'center',
  },
  slotChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  slotTextActive: {
    color: '#000',
  },
  emptySlotsCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  emptySlotsText: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  summaryHeading: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  summaryVal: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  successCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  successSub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  ticketBox: {
    width: '100%',
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  ticketRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }
});
