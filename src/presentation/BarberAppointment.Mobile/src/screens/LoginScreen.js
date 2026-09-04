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
import { authApi } from '../api/barberApi';
import { getApiUrl, setApiUrl } from '../api/client';

export const LoginScreen = () => {
  const { login, register, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register State
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email Verification State
  const [showVerifyView, setShowVerifyView] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [simulationToken, setSimulationToken] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [isUnverifiedError, setIsUnverifiedError] = useState(false);

  // Focus tracking for input border highlight
  const [focusedField, setFocusedField] = useState(null);

  // Server URL State
  const [serverUrl, setServerUrlState] = useState(getApiUrl());
  const [showUrlConfig, setShowUrlConfig] = useState(false);

  const [error, setError] = useState(null);

  const handleQuickDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setIsUnverifiedError(false);
  };

  const handleLoginSubmit = async () => {
    if (!email || !password) {
      setError('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }
    setError(null);
    setIsUnverifiedError(false);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const errMsg = err.message || 'Giriş yapılamadı.';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('doğrula') || errMsg.toLowerCase().includes('dogrula')) {
        setIsUnverifiedError(true);
      }
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
    setIsUnverifiedError(false);
    try {
      const res = await register({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        phone: phone ? phone.trim() : null,
        password: regPassword,
        confirmPassword: confirmPassword,
        role: 1
      });
      if (res?.requiresEmailVerification) {
        setVerifyEmail(regEmail.trim());
        setSimulationToken(res.simulationToken || null);
        setVerifyToken(res.simulationToken || '');
        setShowVerifyView(true);
        Alert.alert(
          'Kayıt Başarılı',
          'Hesabınız oluşturuldu! Sisteme ilk girişinizi yapabilmek için lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu onaylayınız.'
        );
      }
    } catch (err) {
      setError(err.message || 'Kayıt işlemi başarısız.');
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyEmail || !verifyToken) {
      setVerifyError('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await authApi.verifyEmail({ email: verifyEmail.trim(), token: verifyToken.trim() });
      if (res.success || res.data?.success) {
        setShowVerifyView(false);
        setActiveTab('login');
        setEmail(verifyEmail.trim());
        setPassword('');
        setError(null);
        setIsUnverifiedError(false);
        Alert.alert('Tebrikler 🎉', 'E-posta adresiniz başarıyla doğrulandı! Şimdi şifrenizle giriş yapabilirsiniz.');
      } else {
        throw new Error(res.message || res.data?.message || 'Doğrulama başarısız.');
      }
    } catch (err) {
      setVerifyError(err.message || 'Doğrulama kodu geçersiz.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verifyEmail) return;
    setResendLoading(true);
    setVerifyError(null);
    try {
      const res = await authApi.resendVerificationEmail(verifyEmail.trim());
      if (res.data?.simulationToken || res.data?.data?.simulationToken) {
        const sim = res.data?.simulationToken || res.data?.data?.simulationToken;
        setSimulationToken(sim);
        setVerifyToken(sim);
      }
      Alert.alert('Bilgi', 'Yeni doğrulama kodu e-posta adresinize gönderildi.');
    } catch (err) {
      setVerifyError(err.message || 'Kod gönderilemedi.');
    } finally {
      setResendLoading(false);
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
          {!showVerifyView && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'login' && styles.tabButtonActive]}
                onPress={() => { setActiveTab('login'); setError(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                  Giriş Yap
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'register' && styles.tabButtonActive]}
                onPress={() => { setActiveTab('register'); setError(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
                  Kayıt Ol
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error Message Box */}
          {error && !showVerifyView && (
            <View style={styles.errorBoxWrapper}>
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                <TouchableOpacity onPress={() => setError(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#fca5a5', fontWeight: '700', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
              {isUnverifiedError && (
                <TouchableOpacity
                  style={styles.verifyActionBtn}
                  onPress={() => {
                    setVerifyEmail(email.trim());
                    setVerifyToken('');
                    setShowVerifyView(true);
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.verifyActionBtnText}>✉️ E-Posta Doğrulama Kodunu Gir</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showVerifyView ? (
            /* EMAIL VERIFICATION FORM */
            <View>
              <View style={styles.verifyHeader}>
                <Text style={styles.verifyTitle}>✉️ E-Posta Doğrulama</Text>
                <Text style={styles.verifySubtitle}>
                  {verifyEmail} adresine gönderilen 6 haneli kodu giriniz.
                </Text>
              </View>

              {verifyError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {verifyError}</Text>
                  <TouchableOpacity onPress={() => setVerifyError(null)}>
                    <Text style={{ color: '#fca5a5', fontWeight: '700', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {simulationToken && (
                <TouchableOpacity
                  style={styles.simBadge}
                  onPress={() => setVerifyToken(simulationToken)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.simBadgeText}>✨ Test Kodu: {simulationToken} (Doldurmak için tıkla)</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>6 Haneli Doğrulama Kodu</Text>
              <TextInput
                style={[styles.input, styles.codeInput, focusedField === 'verifyToken' && styles.inputFocused]}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                value={verifyToken}
                onChangeText={setVerifyToken}
                keyboardType="number-pad"
                maxLength={6}
                onFocus={() => setFocusedField('verifyToken')}
                onBlur={() => setFocusedField(null)}
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleVerifySubmit}
                disabled={verifyLoading}
                activeOpacity={0.8}
              >
                {verifyLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>✓ E-Postayı Doğrula</Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resendLoading}
                  style={{ padding: 8 }}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    {resendLoading ? 'Gönderiliyor...' : '🔄 Yeni Kod Gönder'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowVerifyView(false)}
                  style={{ padding: 8 }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                    Giriş Ekranına Dön
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : activeTab === 'login' ? (
            /* LOGIN FORM */
            <View>
              <Text style={styles.label}>E-Posta Adresi</Text>
              <TextInput
                style={[styles.input, focusedField === 'loginEmail' && styles.inputFocused]}
                placeholder="ornek@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('loginEmail')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Şifre</Text>
              <View style={[styles.passwordWrapper, focusedField === 'loginPassword' && styles.inputFocused]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('loginPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLoginSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.demoButtonText}>👑 Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickDemo('ali@example.com', 'Password123!')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.demoButtonText}>✂️ Personel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickDemo('burak@example.com', 'Password123!')}
                    activeOpacity={0.7}
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
                style={[styles.input, focusedField === 'regName' && styles.inputFocused]}
                placeholder="Örn: Caner Erkin"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedField('regName')}
                onBlur={() => setFocusedField(null)}
              />

              <Text style={styles.label}>E-Posta</Text>
              <TextInput
                style={[styles.input, focusedField === 'regEmail' && styles.inputFocused]}
                placeholder="caner@example.com"
                placeholderTextColor={colors.textMuted}
                value={regEmail}
                onChangeText={setRegEmail}
                onFocus={() => setFocusedField('regEmail')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Telefon (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, focusedField === 'regPhone' && styles.inputFocused]}
                placeholder="5551234567"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('regPhone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Şifre</Text>
              <View style={[styles.passwordWrapper, focusedField === 'regPassword' && styles.inputFocused]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={colors.textMuted}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  onFocus={() => setFocusedField('regPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showRegPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowRegPassword(!showRegPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showRegPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Şifre Tekrar</Text>
              <View style={[styles.passwordWrapper, focusedField === 'regConfirm' && styles.inputFocused]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Şifreyi tekrar giriniz"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('regConfirm')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRegisterSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
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
  errorBoxWrapper: {
    marginBottom: 15,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyActionBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  verifyActionBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  verifyHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  verifyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  verifySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  simBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  simBadgeText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
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
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 16,
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
