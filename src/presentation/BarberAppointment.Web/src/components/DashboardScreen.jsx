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
  AlertCircle,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { servicesApi, employeesApi, appointmentsApi } from '../api/barberApi';
import { formatTurkishPhone } from '../utils/phoneUtils';
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
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [preselectedEmployee, setPreselectedEmployee] = useState(null);
  const [preselectedService, setPreselectedService] = useState(null);

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
            setPreselectedEmployee(null);
            setPreselectedService(null);
          }}
          onNotify={showNotification}
          initialEmployee={preselectedEmployee}
          initialService={preselectedService}
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
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmployeeModal(emp)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.85rem 1rem',
                        background: 'var(--card-nested-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0284c7';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
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
                        fontSize: '1.1rem',
                        flexShrink: 0
                      }}>
                        {emp.fullName?.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.fullName}</span>
                          <span className="badge badge-employee" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            {emp.services?.length || 0} Hizmet
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '2px' }}>
                          {emp.title || 'Usta Kuaför'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
                        <span style={{ display: 'inline-block' }}>Hizmetleri Gör</span>
                        <ChevronRight size={16} />
                      </div>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Üyelik Durumu</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '2px' }}>
                {user?.memberSince ? new Date(user.memberSince).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Aktif Üye'}
              </div>
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
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginTop: '2px' }}>
                {(user?.phoneNumber || user?.phone) ? formatTurkishPhone(user?.phoneNumber || user?.phone) : 'Belirtilmemiş'}
              </div>
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

      {/* ─── MODAL: BERBER HİZMETLERİ VE DETAY ─────────────────────────────── */}
      {selectedEmployeeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--card-nested-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#fff',
                  fontSize: '1.3rem',
                  flexShrink: 0
                }}>
                  {selectedEmployeeModal.fullName?.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedEmployeeModal.fullName}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 500 }}>
                    {selectedEmployeeModal.title || 'Usta Kuaför'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Sub-info Bar */}
            <div style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(2, 132, 199, 0.08)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} color="#38bdf8" />
                <span>
                  Çalışma Saatleri: {selectedEmployeeModal.workStartTime ? String(selectedEmployeeModal.workStartTime).slice(0, 5) : '09:00'} - {selectedEmployeeModal.workEndTime ? String(selectedEmployeeModal.workEndTime).slice(0, 5) : '19:00'}
                </span>
              </div>
              {selectedEmployeeModal.workingDays ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={15} color="#fbbf24" />
                  <span>
                    Çalışma Günleri: {(() => {
                      const days = selectedEmployeeModal.workingDays.split(',').map(Number);
                      if (days.length === 7) return 'Haftanın 7 Günü';
                      const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                      return days.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map(d => dayLabels[d]).join(', ');
                    })()}
                  </span>
                </div>
              ) : (selectedEmployeeModal.weeklyOffDay !== null && selectedEmployeeModal.weeklyOffDay !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={15} color="#fbbf24" />
                  <span>
                    İzin Günü: {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][selectedEmployeeModal.weeklyOffDay] || 'Pazar'}
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Body: Services List */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scissors size={16} color="#fbbf24" />
                  <span>Verdiği Hizmetler ({selectedEmployeeModal.services?.length || 0})</span>
                </h4>
              </div>

              {(!selectedEmployeeModal.services || selectedEmployeeModal.services.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Bu personel için henüz tanımlanmış bir hizmet bulunmamaktadır.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedEmployeeModal.services.map((srv) => (
                    <div
                      key={srv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        background: 'var(--card-nested-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ flex: 1, marginRight: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{srv.name}</span>
                          {srv.isComposite && (
                            <span style={{
                              fontSize: '0.65rem',
                              background: '#7c3aed',
                              color: '#fff',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              Paket
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <Clock size={13} />
                          <span>{srv.durationMinutes} dakika</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                          {srv.price} ₺
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const fullSrv = services.find(s => s.id === srv.id) || srv;
                            setPreselectedService(fullSrv);
                            setPreselectedEmployee(selectedEmployeeModal);
                            setSelectedEmployeeModal(null);
                            setActiveTab('book');
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        >
                          Seç & Randevu Al
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--card-nested-bg)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setSelectedEmployeeModal(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.5rem 1rem' }}
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreselectedEmployee(selectedEmployeeModal);
                  setPreselectedService(null);
                  setSelectedEmployeeModal(null);
                  setActiveTab('book');
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
              >
                <Scissors size={15} />
                <span>Bu Kuaförle Randevu Al</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
