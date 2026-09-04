import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, Shield, Scissors, UserCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState(1); // 1 = Customer, 2 = Admin, 3 = Employee
  const [showRegPassword, setShowRegPassword] = useState(false);

  // UI Status
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setError(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!loginEmail || !loginPassword) {
      setError('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      setSuccessMsg('Giriş başarılı! Yönlendiriliyorsunuz...');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName || !regEmail || !regPassword || !regConfirmPassword) {
      setError('Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: regFullName,
        email: regEmail,
        phone: regPhone || null,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        role: Number(regRole)
      });
      setSuccessMsg('Hesabınız başarıyla oluşturuldu! Hoş geldiniz.');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '2rem auto',
      padding: '0 1rem'
    }}>
      {/* Brand Header Icon */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 1rem',
          borderRadius: '20px',
          background: 'var(--primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(245, 158, 11, 0.4)'
        }}>
          <Scissors size={32} color="#000" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>
          {activeTab === 'login' ? 'Tekrar Hoş Geldiniz' : 'Aramıza Katılın'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          {activeTab === 'login' 
            ? 'Randevularınızı yönetmek için giriş yapın' 
            : 'Hemen hesabınızı oluşturup randevu alın'}
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.65rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'login' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'login' ? '#000' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.65rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'register' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'register' ? '#000' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="alert-card alert-card-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, whiteSpace: 'pre-line' }}>{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', padding: '2px' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="alert-card alert-card-success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{successMsg}</div>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">E-Posta Adresi</label>
              <div className="form-input-wrapper">
                <Mail size={18} className="form-input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="ornek@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Şifre</label>
              </div>
              <div className="form-input-wrapper">
                <Lock size={18} className="form-input-icon" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.85rem' }}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>Giriş Yapılıyor...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} />
                  <span>Sisteme Giriş Yap</span>
                </div>
              )}
            </button>

            {/* Quick Demo Logins */}
            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
                Hızlı Test Girişi (Tek Tıkla)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('superadmin@example.com', 'AdminPassword123!')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                >
                  <Shield size={14} color="#fbbf24" />
                  <span>👑 Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('ali@example.com', 'Password123!')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                >
                  <Scissors size={14} color="#38bdf8" />
                  <span>✂️ Personel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('burak@example.com', 'Password123!')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                >
                  <UserCheck size={14} color="#34d399" />
                  <span>👤 Müşteri</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Ad Soyad</label>
              <div className="form-input-wrapper">
                <User size={18} className="form-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ahmet Yılmaz"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-Posta Adresi</label>
              <div className="form-input-wrapper">
                <Mail size={18} className="form-input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="ahmet@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Telefon Numarası (İsteğe Bağlı)</label>
              <div className="form-input-wrapper">
                <Phone size={18} className="form-input-icon" />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="5551234567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Hesap Türü / Rol</label>
              <select
                className="form-select"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
              >
                <option value={1}>👤 Müşteri (Randevu Alan)</option>
                <option value={3}>✂️ Personel (Kuaför)</option>
                <option value={2}>👑 Yönetici (Admin)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Şifre</label>
              <div className="form-input-wrapper">
                <Lock size={18} className="form-input-icon" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.85rem' }}
                  placeholder="En az 6 karakter"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Şifre Tekrar</label>
              <div className="form-input-wrapper">
                <Lock size={18} className="form-input-icon" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.85rem' }}
                  placeholder="Şifrenizi tekrar giriniz"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  <span>Hesap Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <UserCheck size={18} />
                  <span>Hesap Oluştur</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
