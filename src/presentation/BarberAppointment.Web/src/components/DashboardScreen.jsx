import React, { useState, useEffect } from 'react';
import {
  Shield,
  Scissors,
  User,
  Sparkles,
  Clock,
  Calendar,
  Key,
  CheckCircle,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { servicesApi, employeesApi, appointmentsApi } from '../api/barberApi';
import { CustomerBookingWizard } from './customer/CustomerBookingWizard';
import { CustomerAppointmentsView } from './customer/CustomerAppointmentsView';

export const DashboardScreen = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) => {
  const { user, roleName } = useAuth();
  const [internalActiveTab, setInternalActiveTab] = useState('book'); // 'book' | 'appointments' | 'explore' | 'profile'
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setInternalActiveTab;
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [srvRes, empRes, apptRes] = await Promise.all([
        servicesApi.getAll(true),
        employeesApi.getAll(true),
        appointmentsApi.getMy().catch(() => ({ success: false, data: [] }))
      ]);

      if (srvRes.success) setServices(srvRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
      if (apptRes.success) setMyAppointments(apptRes.data || []);
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const upcomingCount = myAppointments.filter(
    a => (a.status === 1 || a.status === 2) && new Date(a.startAt) >= new Date()
  ).length;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1100px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.85rem 1.25rem',
          background: toast.type === 'success' ? '#065f46' : toast.type === 'error' ? '#991b1b' : '#1e293b',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="glass-card" style={{
        padding: '2rem 2.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--hero-bg)',
        border: '1px solid var(--hero-border)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'var(--primary-glow)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              background: 'rgba(245, 158, 11, 0.15)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              marginBottom: '0.85rem',
              color: '#fbbf24',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              <Sparkles size={14} /> Müşteri Randevu Portalı
            </div>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.4rem' }}>
              Hoş Geldiniz, <span style={{ color: 'var(--primary-400)' }}>{user?.fullName}</span>! 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', lineHeight: 1.5 }}>
              İstediğiniz berber ve hizmeti seçerek anında online randevunuzu oluşturabilir veya mevcut randevularınızı takip edebilirsiniz.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('book')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem' }}
            >
              <Scissors size={16} />
              <span>Hemen Randevu Al</span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.4rem' }}
            >
              <Calendar size={16} />
              <span>Randevularım ({upcomingCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem',
        marginBottom: '2rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('book')}
          className={`btn btn-sm ${activeTab === 'book' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
        >
          <Scissors size={16} />
          <span>Randevu Al</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`btn btn-sm ${activeTab === 'appointments' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
        >
          <Calendar size={16} />
          <span>Randevularım</span>
          {upcomingCount > 0 && (
            <span style={{
              background: '#fbbf24',
              color: '#000',
              padding: '0.1rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {upcomingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('explore')}
          className={`btn btn-sm ${activeTab === 'explore' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
        >
          <Sparkles size={16} />
          <span>Hizmetler & Uzman Kadro</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
        >
          <User size={16} />
          <span>Hesap Bilgilerim</span>
        </button>
      </div>

      {/* ─── TAB 1: RANDEVU AL SİHİRBAZI ────────────────────────────────────── */}
      {activeTab === 'book' && (
        <CustomerBookingWizard
          onBookingComplete={() => {
            setActiveTab('appointments');
            fetchOverviewData();
          }}
          onNotify={showNotification}
        />
      )}

      {/* ─── TAB 2: RANDEVULARIM ───────────────────────────────────────────── */}
      {activeTab === 'appointments' && (
        <CustomerAppointmentsView
          onNavigateBooking={() => setActiveTab('book')}
          onNotify={showNotification}
        />
      )}

      {/* ─── TAB 3: HİZMETLER & UZMAN KADRO ────────────────────────────────── */}
      {activeTab === 'explore' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Services Card */}
            <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scissors size={20} color="var(--primary-400)" />
                  <span>Hizmet Kataloğu ({services.length})</span>
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Güncel Fiyatlar</span>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Hizmetler yükleniyor...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {services.map((srv) => (
                    <div key={srv.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: 'var(--card-nested-bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{srv.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                          <Clock size={12} /> {srv.durationMinutes} dakika
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1.1rem' }}>
                          {srv.price} ₺
                        </div>
                        <button
                          onClick={() => setActiveTab('book')}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Seç
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employees Card */}
            <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="#38bdf8" />
                  <span>Uzman Berber Kadrosu ({employees.length})</span>
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kıdemli Ustalar</span>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Personeller yükleniyor...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {employees.map((emp) => (
                    <div key={emp.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem 1rem',
                      background: 'var(--card-nested-bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#fff',
                        fontSize: '1.1rem'
                      }}>
                        {emp.fullName?.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{emp.title || 'Usta Kuaför'}</div>
                      </div>
                      <span className="badge badge-employee">Aktif</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: HESAP BİLGİLERİ ────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="glass-card animate-fade-in" style={{
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--hero-border)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
              <User size={20} /> Hesap Bilgilerim
            </h3>
            <span className="badge badge-customer">Aktif Hesap</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--card-nested-bg)', border: '1px solid var(--card-nested-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Müşteri Numarası</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '2px' }}>#{user?.id}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--card-nested-bg)', border: '1px solid var(--card-nested-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ad Soyad</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '2px' }}>{user?.fullName}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--card-nested-bg)', border: '1px solid var(--card-nested-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>E-Posta</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '2px' }}>{user?.email}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--card-nested-bg)', border: '1px solid var(--card-nested-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Telefon</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '2px' }}>{user?.phoneNumber || user?.phone || 'Belirtilmemiş'}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--card-nested-bg)', border: '1px solid var(--card-nested-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hesap Türü</div>
              <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1.1rem', marginTop: '2px' }}>
                {roleName === 'Admin' ? '👑 Yönetici' : roleName === 'Employee' ? '✂️ Kuaför / Personel' : '👤 Müşteri'}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--card-nested-bg)', border: '1px solid var(--card-nested-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hesap Durumu</div>
              <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem', marginTop: '2px' }}>Aktif</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
