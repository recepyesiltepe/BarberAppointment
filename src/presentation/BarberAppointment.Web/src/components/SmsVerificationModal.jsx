import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, X, Clock, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { smsApi } from '../api/barberApi';
import { useAuth } from '../context/AuthContext';

export const SmsVerificationModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, isAuthenticated } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone Input, 2 = Code Input, 3 = Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [simulationCode, setSimulationCode] = useState(null);
  const [maskedPhone, setMaskedPhone] = useState('');

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(user?.phone || '');
      setCode('');
      setStep(1);
      setError(null);
      setSimulationCode(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setError('Lütfen geçerli bir cep telefonu numarası giriniz (Örn: 05551234567).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await smsApi.sendCode(phoneNumber.trim());
      if (res.success && res.data) {
        setMaskedPhone(res.data.maskedPhoneNumber || phoneNumber);
        setCooldown(res.data.cooldownSeconds || 60);
        if (res.data.simulationCode) {
          setSimulationCode(res.data.simulationCode);
        }
        setStep(2);
      } else {
        throw new Error(res.message || 'Doğrulama kodu gönderilemedi.');
      }
    } catch (err) {
      setError(err.message || 'Kod gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let res;
      if (isAuthenticated) {
        // Oturum açmış kullanıcı için profil telefonunu da güncelle
        res = await smsApi.verifyMyPhone(phoneNumber.trim(), code.trim()).catch(() => 
          smsApi.verifyCode(phoneNumber.trim(), code.trim())
        );
      } else {
        res = await smsApi.verifyCode(phoneNumber.trim(), code.trim());
      }

      if (res.success) {
        setStep(3);
        if (onSuccess) onSuccess(phoneNumber);
      } else {
        throw new Error(res.message || 'Doğrulama kodu geçersiz.');
      }
    } catch (err) {
      setError(err.message || 'Doğrulama başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', padding: '2rem' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <Smartphone size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>SMS Doğrulama</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Telefon numaranızı SMS OTP koduyla doğrulayın</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.3rem', color: 'var(--text-muted)' }}>
            <X size={18} />
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
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ─── STEP 1: NUMARA GİRİŞİ ────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSendCode}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Cep Telefonu Numarası</label>
              <div className="form-input-wrapper">
                <Smartphone size={16} className="form-input-icon" />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="0555 123 45 67"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoFocus
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                Numaranıza 6 haneli tek kullanımlık bir doğrulama SMS'i gönderilecektir.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" style={{ borderColor: '#000', borderTopColor: 'transparent' }} />
                  <span>Kod Gönderiliyor...</span>
                </>
              ) : (
                <span>SMS Doğrulama Kodu Gönder</span>
              )}
            </button>
          </form>
        )}

        {/* ─── STEP 2: KOD DOĞRULAMA ───────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doğrulanan Numara:</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>{maskedPhone || phoneNumber}</div>
              </div>
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
              >
                Değiştir
              </button>
            </div>

            {/* Simülasyon Kodu Bilgilendirmesi (Geliştirici Kolaylığı) */}
            {simulationCode && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#34d399' }}>
                  <Sparkles size={15} />
                  <span>Test Kodu: <strong>{simulationCode}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(simulationCode)}
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
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{ letterSpacing: '0.3em', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}
                  autoFocus
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                Kod 3 dakika boyunca geçerlidir.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.75rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" style={{ borderColor: '#000', borderTopColor: 'transparent' }} />
                  <span>Doğrulanıyor...</span>
                </>
              ) : (
                <span>✓ Kodu Onayla ve Doğrula</span>
              )}
            </button>

            {/* Tekrar Gönder Butonu ve Cooldown */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={cooldown > 0 || loading}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.8rem', color: cooldown > 0 ? 'var(--text-muted)' : 'var(--primary-400)' }}
              >
                {cooldown > 0 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={13} />
                    <span>Yeniden kod istemek için ({cooldown}s)</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <RefreshCw size={13} />
                    <span>Yeni Kod Gönder</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 3: BAŞARI ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.8rem'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Telefon Numarası Doğrulandı!
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#fbbf24' }}>{maskedPhone || phoneNumber}</strong> numarası sistemimizde güvenle doğrulanmıştır. Randevu bildirimleriniz bu numaraya iletilecektir.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontWeight: 700 }}
            >
              Tamam
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

