import React, { useState } from 'react';
import { LayoutDashboard, Scissors, Users, Calendar, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { DashboardView } from './DashboardView';
import { ServicesView } from './ServicesView';
import { EmployeesView } from './EmployeesView';
import { AppointmentsView } from './AppointmentsView';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout = () => {
  const { user, roleName } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'services' | 'employees' | 'appointments'
  
  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'services', label: 'Hizmetler', icon: Scissors },
    { id: 'employees', label: 'Personeller', icon: Users },
    { id: 'appointments', label: 'Randevular', icon: Calendar },
  ];

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          fontWeight: 600,
          fontSize: '0.9rem',
          animation: 'slideDown 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Admin Panel Header & Sub-Nav */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.25rem',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            <Sparkles size={14} /> Salon Yönetim Merkezi
          </div>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.2 }}>
            Kuaför Kontrol Paneli
          </h1>
        </div>

        {/* Tab Navigation Buttons */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '4px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '2px'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.1rem',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--primary-gradient)' : 'transparent',
                  color: isActive ? '#000' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View Rendering */}
      <div className="animate-fade-in">
        {activeTab === 'dashboard' && (
          <DashboardView 
            onNavigateTab={(tab) => setActiveTab(tab)} 
            onNotify={showNotification} 
          />
        )}
        {activeTab === 'services' && (
          <ServicesView onNotify={showNotification} />
        )}
        {activeTab === 'employees' && (
          <EmployeesView onNotify={showNotification} />
        )}
        {activeTab === 'appointments' && (
          <AppointmentsView onNotify={showNotification} />
        )}
      </div>
    </div>
  );
};
