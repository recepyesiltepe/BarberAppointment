import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, setApiUrl } from '../api/client';

export const LoginScreen = () => {
  const { login, register, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(1);

  // Server URL State
  const [serverUrl, setServerUrlState] = useState(getApiUrl());
  const [showUrlConfig, setShowUrlConfig] = useState(false);

  const [error, setError] = useState(null);

  const handleQuickDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  const handleLoginSubmit = async () => {
    if (!email || !password) {
      setError('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Giriş yapılamadı.');
    }
  };

  const handleRegisterSubmit = async () => {
    if (!fullName || !regEmail || !regPassword || !confirmPassword) {
      setError('Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setError(null);
    try {
      await register({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        phone: phone ? phone.trim() : null,
        password: regPassword,
        confirmPassword: confirmPassword,
        role: Number(role)
      });
    } catch (err) {
      setError(err.message || 'Kayıt işlemi başarısız.');
    }
  };

  const handleSaveUrl = () => {
    if (serverUrl) {
      setApiUrl(serverUrl.trim());
      setShowUrlConfig(false);
      Alert.alert('Başarılı', `API URL güncellendi:\n${serverUrl}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>✂️</Text>
          </View>
          <Text style={styles.brandTitle}>
            MAKAS <Text style={{ color: colors.primary }}>&</Text> USTA
          </Text>
          <Text style={styles.brandSubtitle}>
            Mobil Kuaför Randevu Uygulaması
          </Text>
        </View>

        {/* Card Container */}
        <View style={styles.card}>
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'login' && styles.tabButtonActive]}
              onPress={() => { setActiveTab('login'); setError(null); }}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'register' && styles.tabButtonActive]}
              onPress={() => { setActiveTab('register'); setError(null); }}
            >
              <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Box */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {activeTab === 'login' ? (
            /* LOGIN FORM */
            <View>
              <Text style={styles.label}>E-Posta Adresi</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLoginSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>Sisteme Giriş Yap</Text>
                )}
              </TouchableOpacity>

              {/* Quick 1-tap Demo Logins */}
              <View style={styles.demoSection}>
                <Text style={styles.demoTitle}>HIZLI TEST GİRİŞİ (TEK TIKLA)</Text>
                <View style={styles.demoRow}>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickDemo('superadmin@example.com', 'AdminPassword123!')}
                  >
                    <Text style={styles.demoButtonText}>👑 Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickDemo('ali@example.com', 'Password123!')}
                  >
                    <Text style={styles.demoButtonText}>✂️ Personel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickDemo('burak@example.com', 'Password123!')}
                  >
                    <Text style={styles.demoButtonText}>👤 Müşteri</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* REGISTER FORM */
            <View>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Caner Erkin"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>E-Posta</Text>
              <TextInput
                style={styles.input}
                placeholder="caner@example.com"
                placeholderTextColor={colors.textMuted}
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Telefon (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                placeholder="5551234567"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="En az 6 karakter"
                placeholderTextColor={colors.textMuted}
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
              />

              <Text style={styles.label}>Şifre Tekrar</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifreyi tekrar giriniz"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRegisterSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>Hesap Oluştur</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* API Server URL Configurator */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowUrlConfig(!showUrlConfig)}
          >
            <Text style={styles.configToggleText}>
              ⚙️ Sunucu API URL: {getApiUrl()}
            </Text>
          </TouchableOpacity>

          {showUrlConfig && (
            <View style={styles.urlBox}>
              <Text style={styles.urlLabel}>Backend API Adresi:</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrlState}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.saveUrlButton} onPress={handleSaveUrl}>
                <Text style={styles.saveUrlButtonText}>URL Kaydet & Güncelle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 14,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  configToggle: {
    marginTop: 18,
    alignItems: 'center',
  },
  configToggleText: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  urlBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  saveUrlButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveUrlButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  }
});
