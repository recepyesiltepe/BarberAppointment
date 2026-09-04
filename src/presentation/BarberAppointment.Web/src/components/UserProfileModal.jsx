import React, { useState, useEffect } from 'react';
import { User, Shield, CheckCircle2, AlertCircle, X, Smartphone, Calendar, Mail, Edit3, Save, Lock, KeyRound, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser, refreshProfile } = useAuth();
  const { themePreference, setThemePreference, theme } = useTheme();

  // Mode: 'view' | 'edit' | 'password'
  const [mode, setMode] = useState('view');

  // Edit Profile States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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

      if (res.success) {
        setSuccessMsg('Şifreniz başarıyla değiştirildi. Güvenliğiniz için kayıtlı e-posta adresinize bilgilendirme e-postası gönderildi.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setMode('view');
      } else {
        setError(res.message || 'Şifre değiştirilemedi.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Şifre değiştirilirken bir hata oluştu.');
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#121722',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '1.25rem',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
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
                {mode === 'password' ? 'Şifre değişikliği sonrası e-posta bildirimi gönderilir' : 'UserProfileDto ile korunan güvenli hesap bilgileri'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
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
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff'
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
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff'
                  }}
                  required
                />
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: '#93c5fd'
              }}>
                📧 Şifreniz değiştirildiğinde <strong>{user?.email}</strong> adresinize anında bilgilendirme e-postası iletilecektir.
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
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                >
                  <KeyRound size={16} />
                  <span>{loading ? 'Güncelleniyor...' : 'Şifreyi Değiştir'}</span>
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
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
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
                    Rol: {user?.roleName || (user?.role === 2 ? 'Admin' : user?.role === 3 ? 'Employee' : 'Customer')}
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
                  <span style={{ color: 'var(--text-secondary)' }}>Kullanıcı No (ID):</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>#{user?.id}</span>
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

              {/* Security Shield Callout */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <Lock size={18} color="#34d399" />
                <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                  Güvenli DTO İzolasyonu: Parola özetleri, tuzlama verileri ve dahili sistem bayrakları istemciye asla sızdırılmaz.
                </span>
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
};
