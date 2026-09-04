import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Scissors,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { appointmentsApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';

export const CustomerAppointmentsView = ({ onNavigateBooking, onNotify }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'history' | 'all'
  const [cancellingId, setCancellingId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.getMy();
      if (res.success) {
        setAppointments(res.data || []);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      if (onNotify) onNotify('Randevular yüklenirken hata: ' + err.message, 'error');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id, serviceName, timeStr) => {
    if (!window.confirm(`"${serviceName}" randevunuzu iptal etmek istediğinize emin misiniz?\n\nZaman: ${timeStr}`)) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await appointmentsApi.cancel(id);
      if (res.success) {
        if (onNotify) onNotify('Randevunuz başarıyla iptal edildi.', 'success');
        fetchAppointments();
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'İptal işlemi gerçekleştirilemedi.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 2:
        return <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Onaylandı</span>;
      case 3:
        return <span className="badge badge-completed"><CheckCircle2 size={12} /> Tamamlandı</span>;
      case 4:
        return <span className="badge badge-cancelled"><XCircle size={12} /> İptal Edildi</span>;
      case 1:
      default:
        return <span className="badge badge-pending"><Clock size={12} /> Bekliyor</span>;
    }
  };

  const getRelativeTime = (startAt) => {
    const now = new Date();
    const start = new Date(startAt);
    const diffMs = start - now;

    if (diffMs < 0) return 'Tamamlandı / Geçmiş';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `⏳ ${diffDays} gün sonra`;
    if (diffHours > 0) return `⏳ ${diffHours} saat sonra`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `⏳ ${diffMins} dakika sonra`;
  };

  const filteredAppointments = appointments.filter(a => {
    const isPast = new Date(a.startAt) < new Date() || a.status === 3 || a.status === 4;
    if (filterTab === 'upcoming') return !isPast && (a.status === 1 || a.status === 2);
    if (filterTab === 'history') return isPast;
    return true;
  });

  const upcomingCount = appointments.filter(a => (a.status === 1 || a.status === 2) && new Date(a.startAt) >= new Date()).length;
  const historyCount = appointments.filter(a => a.status === 3 || a.status === 4 || new Date(a.startAt) < new Date()).length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={26} color="var(--primary-400)" />
            <span>Randevularım</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Geçmiş ve yaklaşan tüm kuaför randevularınızın takibi ve yönetimi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchAppointments}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Yenile"
          >
            <RefreshCw size={14} />
            <span>Yenile</span>
          </button>

          {onNavigateBooking && (
            <button
              onClick={onNavigateBooking}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} />
              <span>Yeni Randevu Al</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="nav-tabs-wrapper" style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '0.35rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`btn btn-sm ${filterTab === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Yaklaşan Randevular ({upcomingCount})
        </button>

        <button
          onClick={() => setFilterTab('history')}
          className={`btn btn-sm ${filterTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Geçmiş Randevular ({historyCount})
        </button>

        <button
          onClick={() => setFilterTab('all')}
          className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Tüm Randevular ({appointments.length})
        </button>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-lg)' }}>
          <div className="spinner-sm" style={{ width: '28px', height: '28px', margin: '0 auto 1rem', borderColor: 'var(--primary-400)', borderTopColor: 'transparent' }} />
          <div>Randevularınız yükleniyor...</div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✂️</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {filterTab === 'upcoming' ? 'Yaklaşan Randevunuz Bulunmuyor' : 'Bu kategoride randevu kaydı yok'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
            Dilediğiniz uzman kuaför ve size en uygun saat dilimini seçerek hemen yeni bir randevu oluşturabilirsiniz.
          </p>
          {onNavigateBooking && (
            <button onClick={onNavigateBooking} className="btn btn-primary">
              <Plus size={16} />
              <span>Hemen Randevu Al</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredAppointments.map((a) => {
            const start = new Date(a.startAt);
            const end = new Date(a.endAt);
            const dateStr = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
            const timeStr = `${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            const countdown = getRelativeTime(a.startAt);
            const canCancel = (a.status === 1 || a.status === 2) && new Date(a.startAt) >= new Date();

            return (
              <div
                key={a.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: canCancel ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.serviceName}</h3>
                      {getStatusBadge(a.status)}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0284c7', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={14} /> Kuaför: {a.employeeName}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24' }}>{a.price} ₺</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.durationMinutes} dakika</div>
                  </div>
                </div>

                {/* Countdown pill for upcoming active appointment */}
                {canCancel && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(245, 158, 11, 0.12)',
                    borderRadius: 'var(--radius-full)',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '1rem'
                  }}>
                    {countdown}
                  </div>
                )}

                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--card-nested-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <Calendar size={16} color="var(--primary-400)" />
                    <span>{dateStr}</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <Clock size={16} color="var(--primary-400)" />
                    <span style={{ fontWeight: 600, color: '#fbbf24' }}>{timeStr}</span>
                  </div>

                  {canCancel && (
                    <button
                      onClick={() => handleCancel(a.id, a.serviceName, `${dateStr} ${timeStr}`)}
                      disabled={cancellingId === a.id}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                      {cancellingId === a.id ? (
                        <span className="spinner-sm" style={{ width: '13px', height: '13px', borderColor: '#f87171', borderTopColor: 'transparent' }} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      <span>{cancellingId === a.id ? 'İptal Ediliyor...' : 'Randevuyu İptal Et'}</span>
                    </button>
                  )}
                </div>

                {a.notes && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    💬 Not: {a.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

