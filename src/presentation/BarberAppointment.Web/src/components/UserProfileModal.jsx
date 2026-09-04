import React, { useState, useEffect } from 'react';
import { User, Shield, CheckCircle2, AlertCircle, X, Smartphone, Calendar, Mail, Edit3, Save, Lock } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setIsEditing(false);
      setError(null);
      setSuccessMsg(null);
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
        setIsEditing(false);
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
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={20} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Güvenli Profilim
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                UserProfileDto ile korunan güvenli hesap bilgileri
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

          {isEditing ? (
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
                  onClick={() => setIsEditing(false)}
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
          ) : (
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
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {user?.fullName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                    <Mail size={13} /> {user?.email}
                  </div>
                  <div style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    Rol: {user?.roleName || (user?.role === 2 ? 'Admin' : user?.role === 3 ? 'Employee' : 'Customer')}
                  </div>
                </div>
              </div>

              {/* Info Items */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '0.5rem 1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8' }}>Kullanıcı No (ID):</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>#{user?.id}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8' }}>Telefon Numarası:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{user?.phone || 'Belirtilmedi'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8' }}>SMS Doğrulama:</span>
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
                  <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} /> Kayıt Tarihi:
                  </span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{memberSinceFormatted}</span>
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
                <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                  Güvenli DTO İzolasyonu: Parola özetleri, tuzlama verileri ve dahili sistem bayrakları istemciye asla sızdırılmaz.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Edit3 size={15} />
                  <span>Profili Düzenle</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
