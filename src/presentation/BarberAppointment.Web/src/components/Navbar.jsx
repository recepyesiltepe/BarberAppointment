import React from 'react';
import { Scissors, LogOut, Shield, User, Sparkles, CircleDot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ currentTab, setCurrentTab }) => {
  const { user, isAuthenticated, logout, roleName } = useAuth();

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
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.85rem 0'
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
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
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
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.35rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)'
              }}>
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
            <button
              onClick={() => setCurrentTab('login')}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={16} />
              <span>Giriş Yap / Kaydol</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
