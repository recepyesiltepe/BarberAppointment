import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, Scissors, TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { appointmentsApi, servicesApi, employeesApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';

export const DashboardView = ({ onNavigateTab, onNotify }) => {
  const { user, roleName } = useAuth();
  const isAdmin = roleName === 'Admin' || user?.role === 2;

  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const [apptRes, srvRes, empRes] = await Promise.all([
          appointmentsApi.getAll().catch(() => ({ success: false, data: [] })),
          servicesApi.getAll(false).catch(() => ({ success: false, data: [] })),
          employeesApi.getAll(false).catch(() => ({ success: false, data: [] }))
        ]);

        if (apptRes.success) setAppointments(apptRes.data || []);
        if (srvRes.success) setServices(srvRes.data || []);
        if (empRes.success) setEmployees(empRes.data || []);
      } catch (err) {
        if (onNotify) onNotify('İstatistikler yüklenirken hata: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // Hesaplanan Metrikler
  const totalAppointments = appointments.length;

  // Durumlar: 1 = Pending (Beklemede), 2 = Confirmed (Onaylandı), 3 = Completed (Tamamlandı), 4 = Cancelled (İptal Edildi)
  const activeAppointments = appointments.filter(a => {
    const s = Number(a.status);
    return s === 1 || s === 2 || a.status === 'Pending' || a.status === 'Confirmed';
  }).length;

  const completedAppointments = appointments.filter(a => {
    const s = Number(a.status);
    return s === 3 || a.status === 'Completed';
  }).length;

  const cancelledAppointments = appointments.filter(a => {
    const s = Number(a.status);
    return s === 4 || a.status === 'Cancelled';
  }).length;

  // Tahmini Toplam Ciro: İptal edilen randevular (Cancelled = 4) KESİNLİKLE dahil edilmez.
  // Yalnızca geçerli aktif (1, 2) ve tamamlanmış (3) randevuların ücretleri toplanır.
  const validRevenueAppointments = appointments.filter(a => {
    const s = Number(a.status);
    const isCancelled = s === 4 || a.status === 'Cancelled';
    const isValid = s === 1 || s === 2 || s === 3 || a.status === 'Pending' || a.status === 'Confirmed' || a.status === 'Completed';
    return !isCancelled && isValid;
  });

  const totalRevenue = validRevenueAppointments.reduce((sum, a) => {
    const priceVal = Number(a.price) || Number(a.service?.price) || 0;
    return sum + priceVal;
  }, 0);

  const activeEmployees = employees.filter(e => e.isActive).length;
  const activeServices = services.filter(s => s.isActive).length;

  const recentAppointments = [...appointments]
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
    .slice(0, 5);

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* KPI 1: Toplam Randevu */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Toplam Randevu</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {loading ? '...' : totalAppointments}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
                <CheckCircle2 size={12} /> {activeAppointments} aktif bekliyor
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <Calendar size={24} />
            </div>
          </div>
        </div>

        {/* KPI 2: Toplam Ciro / Gelir (Yalnızca Yönetici Görür) */}
        {isAdmin && (
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tahmini Toplam Ciro</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.35rem' }}>
                  {loading ? '...' : `${totalRevenue.toLocaleString('tr-TR')} ₺`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {completedAppointments} tamamlanan • {activeAppointments} aktif (İptaller hariç)
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                fontSize: '1.6rem',
                fontWeight: 800,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: 1
              }}>
                ₺
              </div>
            </div>
          </div>
        )}

        {/* KPI 3: Aktif Personel (Yalnızca Yönetici Görür) */}
        {isAdmin && (
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aktif Personel</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.35rem' }}>
                  {loading ? '...' : `${activeEmployees} / ${employees.length}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  Uzman kadro
                </div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <UserCheck size={24} />
              </div>
            </div>
          </div>
        )}

        {/* KPI 4: Aktif Hizmetler */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aktif Hizmet Kataloğu</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {loading ? '...' : `${activeServices} / ${services.length}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Bakım & tıraş seçenekleri
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <Scissors size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Appointments & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Appointments */}
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--primary-400)" />
              <span>Son Randevular</span>
            </h3>
            <button
              onClick={() => onNavigateTab('appointments')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <span>Tümünü Gör</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {recentAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Henüz randevu kaydı yok.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentAppointments.map(a => {
                const start = new Date(a.startAt);
                return (
                  <div key={a.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--card-nested-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {a.serviceName} • {a.employeeName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>
                        {a.price} ₺
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Management Shortcuts */}
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="#38bdf8" />
            <span>Hızlı İşlemler & Kısayollar</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              onClick={() => onNavigateTab('appointments')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={20} color="#fbbf24" />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Randevu Takvimi</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Randevuları onayla, tamamla veya iptal et</div>
                </div>
              </div>
              <ArrowUpRight size={18} color="#fbbf24" />
            </div>

            {isAdmin && (
              <div
                onClick={() => onNavigateTab('services')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'rgba(168, 85, 247, 0.06)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Scissors size={20} color="#c084fc" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Hizmet Listesi & Fiyatlar</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Yeni hizmet ekle, süre ve ücret güncelle</div>
                  </div>
                </div>
                <ArrowUpRight size={18} color="#c084fc" />
              </div>
            )}

            {isAdmin && (
              <div
                onClick={() => onNavigateTab('employees')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <UserCheck size={20} color="#38bdf8" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Personel Kadrosu</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kuaför ekle ve hizmet yetkilerini düzenle</div>
                  </div>
                </div>
                <ArrowUpRight size={18} color="#38bdf8" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
