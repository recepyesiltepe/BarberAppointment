import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, UserCheck, Scissors, TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { appointmentsApi, servicesApi, employeesApi } from '../../api/barberApi';

export const DashboardView = ({ onNavigateTab, onNotify }) => {
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
  const activeAppointments = appointments.filter(a => a.status === 2 || a.status === 1).length;
  const completedAppointments = appointments.filter(a => a.status === 3).length;
  const totalRevenue = appointments
    .filter(a => a.status === 2 || a.status === 3)
    .reduce((sum, a) => sum + (a.price || 0), 0);

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
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
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

        {/* KPI 2: Toplam Ciro / Gelir */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tahmini Toplam Ciro</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.35rem' }}>
                {loading ? '...' : `${totalRevenue} ₺`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                {completedAppointments} tamamlanan işlem
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* KPI 3: Aktif Personel */}
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

        {/* KPI 4: Aktif Hizmetler */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aktif Hizmet Kataloğu</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
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
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{a.customerName}</div>
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
                  <div style={{ fontWeight: 600, color: '#fff' }}>Randevu Takvimi</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Randevuları onayla, tamamla veya iptal et</div>
                </div>
              </div>
              <ArrowUpRight size={18} color="#fbbf24" />
            </div>

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
                  <div style={{ fontWeight: 600, color: '#fff' }}>Hizmet Listesi & Fiyatlar</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Yeni hizmet ekle, süre ve ücret güncelle</div>
                </div>
              </div>
              <ArrowUpRight size={18} color="#c084fc" />
            </div>

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
                  <div style={{ fontWeight: 600, color: '#fff' }}>Personel Kadrosu</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kuaför ekle ve hizmet yetkilerini düzenle</div>
                </div>
              </div>
              <ArrowUpRight size={18} color="#38bdf8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
