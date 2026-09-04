import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Shield, CheckCircle2, AlertCircle, X, Smartphone, Calendar, Mail, Edit3, Save, Lock, KeyRound, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { VerifyEmailModal } from './VerifyEmailModal';

export const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser, refreshProfile } = useAuth();
  const { themePreference, setThemePreference, theme } = useTheme();

  // Mode: 'view' | 'edit' | 'password' | 'password-verify'
  const [mode, setMode] = useState('view');
  const [isVerifyEmailOpen, setIsVerifyEmailOpen] = useState(false);

  // Edit Profile States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password Change Verification (Adım 2)
  const [verifyCode, setVerifyCode] = useState('');
  const [simulationToken, setSimulationToken] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Escape tuşu ile kapatma ve scroll kilidi
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setMode('view');
      setError(null);
      setSuccessMsg(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setVerifyCode('');
      setSimulationToken(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName || fullName.trim().length < 2) {
      setError('Ad Soyad en az 2 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await authApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone ? phone.trim() : null
      });

      if (res.success && res.data) {
        updateUser(res.data);
        setSuccessMsg('Profil bilgileriniz başarıyla güncellendi!');
        setMode('view');
        if (refreshProfile) await refreshProfile();
      } else {
        setError(res.message || 'Profil güncellenemedi.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setError('Mevcut şifrenizi giriniz.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Yeni şifre mevcut şifrenizden farklı olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword
      });

      if (res.success && res.data?.requiresVerification) {
        // Adım 1 tamamlandı — doğrulama ekranına geç
        setSimulationToken(res.data.simulationToken || null);
        setVerifyCode('');
        setError(null);
        setMode('password-verify');
      } else {
        setError(res.message || 'Şifre değiştirme başlatılamadı.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Şifre değiştirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    setError(null);

    if (!verifyCode || verifyCode.trim().length !== 6) {
      setError('Lütfen e-postanıza gönderilen 6 haneli kodu giriniz.');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.confirmPasswordChange({ verificationCode: verifyCode.trim() });

      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setVerifyCode('');
        setSimulationToken(null);
        setMode('view');
        setSuccessMsg('Şifreniz başarıyla değiştirildi. Güvenliğiniz için kayıtlı e-posta adresinize bilgilendirme e-postası gönderildi.');
      } else {
        setError(res.message || 'Doğrulama başarısız.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Doğrulama sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const memberSinceFormatted = user?.memberSince
    ? new Date(user.memberSince).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Kayıtlı Üye';

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--modal-overlay, rgba(0, 0, 0, 0.75))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-medium)',
          borderRadius: '1.25rem',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          margin: 'auto'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card-nested-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: mode === 'password' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {mode === 'password' ? <KeyRound size={20} color="#f87171" /> : <Shield size={20} color="#fbbf24" />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {mode === 'password' ? 'Şifre Değiştirme & Güvenlik' : mode === 'edit' ? 'Profili Düzenle' : 'Güvenli Profilim'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {mode === 'password' ? 'Şifre değişikliği sonrası e-posta bildirimi gönderilir' : 'Hesap ve profil bilgilerinizi yönetin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'edit' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05551234567"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                  Telefon no değiştirilirse SMS doğrulaması yenilenmelidir.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setMode('view'); setError(null); }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Save size={16} />
                  <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'password' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Mevcut Şifreniz
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Yeni Şifre (En az 6 karakter)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Yeni Şifre Tekrar
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: '#c4b5fd'
              }}>
                🔐 Devam ettiğinizde <strong>{user?.email}</strong> adresinize 6 haneli bir doğrulama kodu gönderilecektir. Kodu girdikten sonra şifreniz değiştirilecektir.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setMode('view'); setError(null); }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                >
                  <KeyRound size={16} />
                  <span>{loading ? 'Kod gönderiliyor...' : 'Doğrulama Kodu Gönder'}</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'password-verify' && (
            <form onSubmit={handleConfirmPasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📬</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.25rem' }}>
                  Doğrulama Kodu Gönderildi
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#e2e8f0' }}>{user?.email}</strong> adresinize 6 haneli bir kod iletildi. Kodu aşağıya giriniz.
                </div>
              </div>

              {simulationToken && (
                <div
                  onClick={() => setVerifyCode(simulationToken)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px dashed rgba(245, 158, 11, 0.4)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.74rem',
                    color: '#fbbf24',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  🧪 <strong>Simülasyon Kodu:</strong> {simulationToken} — <span style={{ textDecoration: 'underline' }}>tıkla otomatik doldur</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                  6 Haneli Doğrulama Kodu
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: 'var(--text-primary)',
                    fontSize: '1.5rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.4em',
                    textAlign: 'center'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setMode('password'); setError(null); setVerifyCode(''); }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Geri
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || verifyCode.length !== 6}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                >
                  <Shield size={16} />
                  <span>{loading ? 'Onaylanıyor...' : 'Şifreyi Onayla'}</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'view' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Profile Overview Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--card-nested-bg)',
                borderRadius: '12px',
                border: '1px solid var(--card-nested-border)'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--primary-gradient)',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {user?.fullName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                    <Mail size={13} /> {user?.email}
                  </div>
                  <div style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    {user?.role === 2 ? '👑 Yönetici' : user?.role === 3 ? '✂️ Kuaför / Personel' : '👤 Müşteri Hesabı'}
                  </div>
                </div>
              </div>

              {/* Info Items */}
              <div style={{
                background: 'var(--btn-secondary-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                padding: '0.5rem 1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Müşteri Numarası:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>#{user?.id}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>E-Posta Doğrulama:</span>
                  {user?.isEmailVerified ? (
                    <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={14} /> Doğrulandı
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem' }}>
                        Henüz Doğrulanmadı
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsVerifyEmailOpen(true)}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', height: 'auto' }}
                      >
                        Doğrula
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Telefon Numarası:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.phone || 'Belirtilmedi'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SMS Doğrulama:</span>
                  {user?.isPhoneVerified ? (
                    <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={14} /> Doğrulandı
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem' }}>
                      Henüz Doğrulanmadı
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} /> Kayıt Tarihi:
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{memberSinceFormatted}</span>
                </div>
              </div>

              {/* Theme Preference Selector (Ek Geliştirme 7) */}
              <div style={{
                background: 'var(--btn-secondary-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                padding: '0.85rem 1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Palette size={15} color="#f59e0b" /> Görünüm & Tema Tercihi
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Aktif: {theme === 'dark' ? '🌙 Koyu' : '☀️ Açık'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setThemePreference('system')}
                    className="btn btn-sm"
                    style={{
                      background: themePreference === 'system' ? 'var(--bg-card-solid)' : 'transparent',
                      color: themePreference === 'system' ? 'var(--primary-500)' : 'var(--text-secondary)',
                      border: themePreference === 'system' ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                      fontWeight: themePreference === 'system' ? 700 : 500,
                      gap: '0.35rem',
                      padding: '0.5rem 0.25rem'
                    }}
                  >
                    <Monitor size={14} />
                    <span>Sistem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemePreference('light')}
                    className="btn btn-sm"
                    style={{
                      background: themePreference === 'light' ? 'var(--bg-card-solid)' : 'transparent',
                      color: themePreference === 'light' ? '#d97706' : 'var(--text-secondary)',
                      border: themePreference === 'light' ? '1px solid #d97706' : '1px solid var(--border-subtle)',
                      fontWeight: themePreference === 'light' ? 700 : 500,
                      gap: '0.35rem',
                      padding: '0.5rem 0.25rem'
                    }}
                  >
                    <Sun size={14} />
                    <span>Açık</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemePreference('dark')}
                    className="btn btn-sm"
                    style={{
                      background: themePreference === 'dark' ? 'var(--bg-card-solid)' : 'transparent',
                      color: themePreference === 'dark' ? '#fbbf24' : 'var(--text-secondary)',
                      border: themePreference === 'dark' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                      fontWeight: themePreference === 'dark' ? 700 : 500,
                      gap: '0.35rem',
                      padding: '0.5rem 0.25rem'
                    }}
                  >
                    <Moon size={14} />
                    <span>Koyu</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                  {themePreference === 'system' 
                    ? '💻 Cihazınızın/tarayıcınızın açık/koyu modu otomatik algılanır.' 
                    : '📌 Manuel tema seçiminiz bu tarayıcıda kalıcı olarak saklanır.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setMode('edit'); setError(null); setSuccessMsg(null); }}
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                >
                  <Edit3 size={15} />
                  <span>Profili Düzenle</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('password'); setError(null); setSuccessMsg(null); }}
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                >
                  <KeyRound size={15} />
                  <span>Şifre Değiştir</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent}
      <VerifyEmailModal
        isOpen={isVerifyEmailOpen}
        onClose={() => setIsVerifyEmailOpen(false)}
        onSuccess={async () => {
          if (refreshProfile) await refreshProfile();
        }}
      />
    </>
  );
};
