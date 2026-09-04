import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { AdminLayout } from './components/admin/AdminLayout';
import { Scissors, Clock, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';

const MainContent = ({
  currentTab,
  setCurrentTab,
  customerTab,
  setCustomerTab,
  adminTab,
  setAdminTab
}) => {
  const { isAuthenticated, user, roleName } = useAuth();

  if (isAuthenticated) {
    // Admin veya Personel ise Yönetim Paneli göster
    if (roleName === 'Admin' || roleName === 'Employee') {
      return <AdminLayout activeTab={adminTab} setActiveTab={setAdminTab} />;
    }

    // Müşteri oturumu
    return <DashboardScreen activeTab={customerTab} setActiveTab={setCustomerTab} />;
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
  const [customerTab, setCustomerTab] = useState('book');
  const [adminTab, setAdminTab] = useState('dashboard');

  const handleNavigateHome = () => {
    setCurrentTab('home');
    setCustomerTab('book');
    setAdminTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onNavigateHome={handleNavigateHome}
        />
        <main style={{ flex: 1 }}>
          <MainContent
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            customerTab={customerTab}
            setCustomerTab={setCustomerTab}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
          />
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
