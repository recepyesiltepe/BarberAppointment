import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { AdminLayout } from './components/admin/AdminLayout';
import { Scissors, Sparkles, Shield, Clock, Calendar, CheckCircle2, ChevronRight, LayoutDashboard, User } from 'lucide-react';

const MainContent = ({ currentTab, setCurrentTab }) => {
  const { isAuthenticated, user, roleName } = useAuth();
  const [viewMode, setViewMode] = useState('admin'); // 'admin' | 'customer'

  if (isAuthenticated) {
    // Admin veya Personel ise Yönetim Paneli göster
    if (roleName === 'Admin' || roleName === 'Employee') {
      return (
        <div>
          {/* Mode Switcher Bar */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            padding: '0.5rem 0'
          }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                <Shield size={14} /> Yönetici / Personel Oturumu Aktif
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setViewMode('admin')}
                  className={`btn btn-sm ${viewMode === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                >
                  <LayoutDashboard size={14} />
                  <span>Yönetim Paneli</span>
                </button>
                <button
                  onClick={() => setViewMode('customer')}
                  className={`btn btn-sm ${viewMode === 'customer' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                >
                  <User size={14} />
                  <span>Müşteri Önizleme</span>
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'admin' ? <AdminLayout /> : <DashboardScreen />}
        </div>
      );
    }

    // Müşteri oturumu
    return <DashboardScreen />;
  }

  // Giriş Yapılmamışsa
  if (currentTab === 'login') {
    return (
      <div className="container animate-fade-in" style={{ padding: '2rem 1rem' }}>
        <LoginScreen onSuccess={() => setCurrentTab('home')} />
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        padding: '5rem 0 3rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div className="container">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 1.1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-full)',
            color: '#fbbf24',
            fontSize: '0.875rem',
            fontWeight: 700,
            marginBottom: '1.75rem'
          }}>
            <Sparkles size={16} /> Gün 15: Web Yönetim Paneli & CRUD Operasyonları
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em'
          }}>
            Kuaför ve Salon İşletmenizi <br />
            <span style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Tek Bir Panelden Yönetin
            </span>
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.15rem',
            maxWidth: '640px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6
          }}>
            Randevuları canlı takip edin, hizmet kataloğu ve fiyatları güncelleyin, personel ekleyin ve ciro analizlerini görüntüleyin.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentTab('login')}
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
            >
              <span>Yönetim Paneline Giriş Yap</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Quick Login Form */}
      <section style={{ padding: '0 0 4rem' }}>
        <div className="container">
          <LoginScreen onSuccess={() => setCurrentTab('home')} />
        </div>
      </section>
    </div>
  );
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');

  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <main style={{ flex: 1 }}>
          <MainContent currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </main>
        
        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}>
          <div className="container">
            Makas & Usta — Kuaför Randevu Yönetim Sistemi © 2026. ASP.NET Core Web API & React Web.
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
