import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, CheckCircle2, AlertCircle, X, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailModal = ({ isOpen, onClose, onSuccess, initialEmail, initialSimulationToken }) => {
  const { user, updateUser } = useAuth();

  const [email, setEmail] = useState(initialEmail || user?.email || '');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1); // 1 = Verify, 2 = Success
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);
  const [simulationToken, setSimulationToken] = useState(initialSimulationToken || null);

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
      setEmail(initialEmail || user?.email || '');
      setToken('');
      setStep(1);
      setError(null);
      setInfoMsg(null);
      setSimulationToken(initialSimulationToken || null);
    }
  }, [isOpen, user, initialEmail, initialSimulationToken]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!email || email.trim().length === 0) {
      setError('Lütfen doğrulanacak e-posta adresini giriniz.');
      return;
    }
    if (!token || token.trim().length === 0) {
      setError('Lütfen e-posta adresinize gelen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.verifyEmail({ email: email.trim(), token: token.trim() });
      if (res.data?.success || res.success) {
        setStep(2);
        if (updateUser && user?.email?.toLowerCase() === email.trim().toLowerCase()) {
          updateUser({ isEmailVerified: true });
        }
        if (onSuccess) onSuccess(email.trim());
      } else {
        throw new Error(res.data?.message || res.message || 'Doğrulama başarısız.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Doğrulama kodu geçersiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await authApi.resendVerificationEmail(email.trim());
      if (res.data?.data?.simulationToken) {
        setSimulationToken(res.data.data.simulationToken);
      }
      setInfoMsg('Yeni doğrulama kodu e-posta adresinize gönderildi.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Kod gönderilemedi.');
    } finally {
      setResendLoading(false);
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
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}>
              <Mail size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                E-Posta Doğrulama
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Hesabınızı güvene almak için e-postanızı onaylayın
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

        {/* Info Message */}
        {infoMsg && (
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
            <div style={{ flex: 1 }}>{infoMsg}</div>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 1 && (
          <form onSubmit={handleVerify}>
            <div style={{
              background: 'var(--btn-secondary-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doğrulanacak E-Posta:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{email}</div>
            </div>

            {/* Simülasyon Kodu */}
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

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>6 Haneli Doğrulama Kodu</label>
              <div className="form-input-wrapper">
                <KeyRound size={16} className="form-input-icon" />
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  style={{ letterSpacing: '0.3em', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}
                  autoFocus
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                E-postanıza gönderilen 6 haneli kodu giriniz.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="submit"
                disabled={loading || !token}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
              >
                {loading ? 'Doğrulanıyor...' : '✓ E-Postayı Doğrula'}
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

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.8rem', color: 'var(--primary-400)' }}
              >
                <RefreshCw size={13} style={{ marginRight: '4px' }} />
                <span>{resendLoading ? 'Kod Gönderiliyor...' : 'Yeni Doğrulama Kodu Gönder'}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: BAŞARILI */}
        {step === 2 && (
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
              E-Posta Adresiniz Doğrulandı!
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--primary-400, #fbbf24)' }}>{email}</strong> adresiniz sistemimizde başarıyla onaylanmıştır. Artık tüm randevu bildirimlerini güvenle alacaksınız.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '0.8rem 2.5rem', fontWeight: 700 }}
            >
              Tamam / Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
