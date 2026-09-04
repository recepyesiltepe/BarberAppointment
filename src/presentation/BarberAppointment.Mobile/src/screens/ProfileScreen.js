import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, setApiUrl } from '../api/client';
import { smsApi } from '../api/barberApi';

export const ProfileScreen = () => {
  const { user, token, roleName, logout } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getApiUrl());

  // SMS Verification State
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [smsCode, setSmsCode] = useState('');
  const [smsStep, setSmsStep] = useState(1); // 1 = Phone Input, 2 = Code Input, 3 = Verified
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [simulationCode, setSimulationCode] = useState(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (smsCooldown > 0) {
      timer = setInterval(() => {
        setSmsCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [smsCooldown]);

  const handleSendSmsCode = async () => {
    if (!phoneInput || phoneInput.trim().length < 10) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir cep telefonu numarası giriniz (Örn: 05551234567).');
      return;
    }

    setSmsLoading(true);
    try {
      const res = await smsApi.sendCode(phoneInput.trim());
      if (res.success && res.data) {
        setSmsCooldown(res.data.cooldownSeconds || 60);
        if (res.data.simulationCode) {
          setSimulationCode(res.data.simulationCode);
        }
        setSmsStep(2);
        Alert.alert('SMS Gönderildi', `Doğrulama kodu ${res.data.maskedPhoneNumber || phoneInput} numarasına iletildi.`);
      } else {
        Alert.alert('Hata', res.message || 'Kod gönderilemedi.');
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'SMS kodu gönderilirken bir hata oluştu.');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleVerifySmsCode = async () => {
    if (!smsCode || smsCode.trim().length !== 6) {
      Alert.alert('Uyarı', 'Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.');
      return;
    }

    setSmsLoading(true);
    try {
      const res = await smsApi.verifyMyPhone(phoneInput.trim(), smsCode.trim()).catch(() =>
        smsApi.verifyCode(phoneInput.trim(), smsCode.trim())
      );

      if (res.success) {
        setIsPhoneVerified(true);
        setSmsStep(3);
        Alert.alert('Tebrikler 🎉', 'Telefon numaranız başarıyla doğrulandı ve profilinize kaydedildi.');
      } else {
        Alert.alert('Hata', res.message || 'Doğrulama kodu geçersiz.');
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Doğrulama başarısız.');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSaveUrl = () => {
    if (serverUrl) {
      setApiUrl(serverUrl.trim());
      setShowServerConfig(false);
      Alert.alert('Başarılı', `API URL güncellendi:\n${serverUrl}`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.fullName}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {roleName === 'Admin' ? '👑 Yönetici' : roleName === 'Employee' ? '✂️ Personel' : '👤 Müşteri'}
          </Text>
        </View>
      </View>

      {/* User Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Hesap Bilgileri</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kullanıcı Numarası (ID):</Text>
          <Text style={styles.infoVal}>#{user?.id}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>E-Posta:</Text>
          <Text style={styles.infoVal}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefon:</Text>
          <Text style={styles.infoVal}>{user?.phone || 'Belirtilmedi'}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Hesap Durumu:</Text>
          <Text style={[styles.infoVal, { color: colors.success }]}>
            {user?.isActive ? '✓ Aktif Hesap' : 'Pasif'}
          </Text>
        </View>
      </View>

      {/* SMS Verification Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>📱 SMS Telefon Doğrulama</Text>
          {isPhoneVerified && (
            <View style={{ backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>✓ Doğrulandı</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardSub}>
          Randevu onay ve hatırlatma SMS'leri için telefon numaranızı doğrulayınız.
        </Text>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.infoLabel}>Cep Telefonu Numarası</Text>
          <TextInput
            style={styles.input}
            value={phoneInput}
            onChangeText={setPhoneInput}
            placeholder="05551234567"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            editable={smsStep !== 3}
          />

          {smsStep === 1 && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: 4 }]}
              onPress={handleSendSmsCode}
              disabled={smsLoading}
              activeOpacity={0.8}
            >
              {smsLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.saveButtonText, { color: '#000', fontWeight: '700' }]}>
                  SMS Doğrulama Kodu Gönder
                </Text>
              )}
            </TouchableOpacity>
          )}

          {smsStep === 2 && (
            <View style={{ marginTop: 8 }}>
              {simulationCode && (
                <TouchableOpacity
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}
                  onPress={() => setSmsCode(simulationCode)}
                >
                  <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '700' }}>
                    🧪 Test Kodu: {simulationCode} (Doldurmak için tıkla)
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.infoLabel}>6 Haneli Doğrulama Kodu</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 18, letterSpacing: 6, fontWeight: '700' }]}
                value={smsCode}
                onChangeText={(t) => setSmsCode(t.replace(/\D/g, ''))}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: 4 }]}
                onPress={handleVerifySmsCode}
                disabled={smsLoading || smsCode.length !== 6}
                activeOpacity={0.8}
              >
                {smsLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: '#000', fontWeight: '700' }]}>
                    ✓ Kodu Onayla ve Doğrula
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignItems: 'center', marginTop: 10 }}
                onPress={handleSendSmsCode}
                disabled={smsCooldown > 0 || smsLoading}
              >
                <Text style={{ color: smsCooldown > 0 ? colors.textMuted : colors.primaryLight, fontSize: 12 }}>
                  {smsCooldown > 0 ? `Yeniden kod istemek için (${smsCooldown}s)` : 'Yeni Kod Gönder'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {smsStep === 3 && (
            <View style={{ backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, padding: 12, borderRadius: 10, marginTop: 8, alignItems: 'center' }}>
              <Text style={{ color: colors.success, fontWeight: '700', fontSize: 14 }}>
                🎉 Telefon numaranız başarıyla doğrulandı!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* JWT Security Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🔑 Güvenlik & JWT</Text>
          <TouchableOpacity onPress={() => setShowToken(!showToken)}>
            <Text style={styles.toggleText}>{showToken ? 'Gizle' : 'Görüntüle'}</Text>
          </TouchableOpacity>
        </View>

        {showToken ? (
          <View style={{ marginTop: 10 }}>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText}>{token}</Text>
            </View>
            <Text style={styles.tokenHint}>
              Stateless Bearer Token — İsteklerde otomatik taşınır.
            </Text>
          </View>
        ) : (
          <Text style={styles.cardSub}>
            Oturumunuz HMAC-SHA512 ve JWT Bearer standardıyla şifrelenmiştir.
          </Text>
        )}
      </View>

      {/* Network Configuration */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🌐 Sunucu & API Ayarları</Text>
          <TouchableOpacity onPress={() => setShowServerConfig(!showServerConfig)}>
            <Text style={styles.toggleText}>{showServerConfig ? 'Kapat' : 'Düzenle'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardSub}>Bağlı Sunucu: {getApiUrl()}</Text>

        {showServerConfig && (
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrlState}
              placeholder="http://192.168.1.X:5184"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveUrl}>
              <Text style={styles.saveButtonText}>Sunucu URL Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>🚪 Güvenli Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 45,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    color: '#000',
    fontSize: 26,
    fontWeight: '800',
  },
  fullName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  email: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  toggleText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoVal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tokenBox: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  tokenText: {
    color: '#a7f3d0',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  tokenHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 15,
  }
});
