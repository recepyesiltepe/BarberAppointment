import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Mail, Lock, CheckCircle2, AlertCircle, X, Sparkles, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '../api/authApi';

export const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
  const [step, setStep] = useState(1); // 1 = Request, 2 = Reset, 3 = Success
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [simulationToken, setSimulationToken] = useState(null);

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
    if (isOpen) {
      setEmail(initialEmail);
      setToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setStep(1);
      setError(null);
      setSuccessMsg(null);
      setSimulationToken(null);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleRequestToken = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.data?.simulationToken) {
        setSimulationToken(res.data.simulationToken);
      }
      setStep(2);
      setSuccessMsg('Şifre sıfırlama kodu kayıtlı e-posta adresinize gönderildi.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'İstek iletilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!token || token.trim().length === 0) {
      setError('Lütfen e-posta adresinize gelen sıfırlama kodunu giriniz.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword,
        confirmNewPassword
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Şifre sıfırlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--modal-overlay, rgba(0, 0, 0, 0.75))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg, 1.25rem)',
          boxShadow: 'var(--shadow-lg)',
          padding: '1.75rem',
          color: 'var(--text-primary)',
          position: 'relative',
          margin: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              flexShrink: 0
            }}>
              <KeyRound size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Şifremi Unuttum
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                E-posta onayıyla hesabınızın şifresini sıfırlayın
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.4rem', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}
            aria-label="Kapat"
            title="Kapat (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-card" style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            marginBottom: '1rem',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{error}</div>
            <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Success Notice */}
        {successMsg && step === 2 && (
          <div className="alert-card" style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            marginBottom: '1rem',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{successMsg}</div>
          </div>
        )}

        {/* STEP 1: E-POSTA GİRİŞİ */}
        {step === 1 && (
          <form onSubmit={handleRequestToken}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Kayıtlı E-Posta Adresiniz</label>
              <div className="form-input-wrapper">
                <Mail size={16} className="form-input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="ornek@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                Bu adrese tek kullanımlık 30 dakika geçerli şifre sıfırlama kodu gönderilecektir.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={loading || !email}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Kodu Gönder'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
              >
                Vazgeç / Kapat
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: SIFIRLAMA KODU VE YENİ ŞİFRE */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={{
              background: 'var(--btn-secondary-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>İlgili Hesap:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-400, #fbbf24)' }}>{email}</div>
              </div>
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                <ArrowLeft size={12} style={{ marginRight: '3px' }} /> Değiştir
              </button>
            </div>

            {/* Simülasyon Kodu Kolaylığı */}
            {simulationToken && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#10b981' }}>
                  <Sparkles size={16} />
                  <span>Test Kodu: <strong>{simulationToken}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setToken(simulationToken)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                >
                  Kodu Doldur
                </button>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>E-Postaya Gelen Sıfırlama Kodu</label>
              <div className="form-input-wrapper">
                <KeyRound size={16} className="form-input-icon" />
                <input
                  type="text"
                  maxLength={10}
                  className="form-input"
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  style={{ letterSpacing: '0.2em', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Yeni Şifre</label>
              <div className="form-input-wrapper">
                <Lock size={16} className="form-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="En az 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Yeni Şifre Tekrarı</label>
              <div className="form-input-wrapper">
                <Lock size={16} className="form-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Şifreyi tekrar giriniz"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={loading || !token || !newPassword}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
              >
                {loading ? 'Güncelleniyor...' : '✓ Şifreyi Sıfırla ve Güncelle'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
              >
                Vazgeç / Kapat
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: BAŞARILI */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Şifreniz Başarıyla Sıfırlandı!
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Hesabınızın giriş şifresi güncellenmiştir. Yeni şifrenizi kullanarak giriş yapabilirsiniz.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '0.8rem 2.5rem', fontWeight: 700 }}
            >
              Giriş Ekranına Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
