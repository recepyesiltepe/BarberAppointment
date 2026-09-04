import React, { useState } from 'react';
import { Scissors, LogOut, Shield, User, Sparkles, CircleDot, Smartphone, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SmsVerificationModal } from './SmsVerificationModal';
import { UserProfileModal } from './UserProfileModal';

export const Navbar = ({ currentTab, setCurrentTab }) => {
  const { user, isAuthenticated, logout, roleName } = useAuth();
  const { themePreference, setThemePreference } = useTheme();
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getRoleBadge = () => {
    switch (roleName) {
      case 'Admin':
        return <span className="badge badge-admin"><Shield size={12} /> Yönetici</span>;
      case 'Employee':
        return <span className="badge badge-employee"><Scissors size={12} /> Personel</span>;
      default:
        return <span className="badge badge-customer"><User size={12} /> Müşteri</span>;
    }
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--header-bg)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.85rem 0',
      transition: 'background-color 0.25s ease'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand Logo */}
        <div 
          onClick={() => setCurrentTab('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
          }}>
            <Scissors size={22} color="#000000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                MAKAS <span style={{ color: 'var(--primary-400)' }}>&</span> USTA
              </span>
            </div>
            <div className="hide-on-mobile" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CircleDot size={10} color="#10b981" /> .NET 10 & React Web
            </div>
          </div>
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Theme Selector (Segmented Auto/Light/Dark) */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--btn-secondary-bg)',
              padding: '3px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)'
            }}
            title={`Tema Ayarı: ${themePreference === 'system' ? 'Sistem (Otomatik)' : themePreference === 'light' ? 'Açık Tema' : 'Koyu Tema'}`}
          >
            <button
              onClick={() => setThemePreference('system')}
              title="Sistem Tercihini Takip Et (Otomatik)"
              style={{
                background: themePreference === 'system' ? 'var(--bg-card-solid)' : 'transparent',
                color: themePreference === 'system' ? 'var(--primary-500)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: themePreference === 'system' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Monitor size={13} />
              <span className="hide-on-mobile">Oto</span>
            </button>
            <button
              onClick={() => setThemePreference('light')}
              title="Açık Tema (Light Mode)"
              style={{
                background: themePreference === 'light' ? 'var(--bg-card-solid)' : 'transparent',
                color: themePreference === 'light' ? '#d97706' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: themePreference === 'light' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Sun size={13} />
              <span className="hide-on-mobile">Açık</span>
            </button>
            <button
              onClick={() => setThemePreference('dark')}
              title="Koyu Tema (Dark Mode)"
              style={{
                background: themePreference === 'dark' ? 'var(--bg-card-solid)' : 'transparent',
                color: themePreference === 'dark' ? '#fbbf24' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: themePreference === 'dark' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Moon size={13} />
              <span className="hide-on-mobile">Koyu</span>
            </button>
          </div>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                onClick={() => setShowProfileModal(true)}
                title="Güvenli Profil Bilgilerini Görüntüle ve Düzenle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--primary-gradient)',
                  color: '#000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  flexShrink: 0
                }}>
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="hide-on-mobile" style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.fullName}
                  </div>
                  <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                    {getRoleBadge()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSmsModal(true)}
                className="btn btn-secondary btn-sm"
                title="SMS Telefon Doğrulama"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem' }}
              >
                <Smartphone size={15} color="#fbbf24" />
                <span className="hide-on-mobile">SMS Doğrula</span>
              </button>

              <button 
                onClick={logout} 
                className="btn btn-secondary btn-sm"
                title="Çıkış Yap"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem' }}
              >
                <LogOut size={15} />
                <span className="hide-on-mobile">Çıkış</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setShowSmsModal(true)}
                className="btn btn-secondary btn-sm"
                title="SMS Telefon Doğrulama"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.65rem' }}
              >
                <Smartphone size={14} color="#fbbf24" />
                <span className="hide-on-mobile">SMS Doğrula</span>
              </button>

              <button
                onClick={() => setCurrentTab('login')}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Sparkles size={16} />
                <span>Giriş Yap / Kaydol</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SMS Verification Modal */}
      <SmsVerificationModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
};
