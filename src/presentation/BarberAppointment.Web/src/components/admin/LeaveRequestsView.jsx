import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, Clock, Plus, CheckCircle2, XCircle, AlertCircle, X,
  User, Search, Check, Ban, Info, Coffee, CalendarOff, Filter
} from 'lucide-react';
import { leaveApi, employeesApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export const LeaveRequestsView = ({ onNotify }) => {
  const { user, roleName } = useAuth();
  const isAdmin = roleName === 'Admin' || user?.role === 2;
  const isEmployee = roleName === 'Employee' || user?.role === 3;

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtreler
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | '0' (Bekleyen) | '1' (Onaylanan) | '2' (Reddedilen)
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Yeni Talep Modalı
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [leaveMode, setLeaveMode] = useState('fullday'); // 'fullday' | 'hourly' | 'range'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('19:00');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Admin İnceleme / Karar Modalı
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approve' | 'reject' }
  const [adminNote, setAdminNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // İptal Modalı
  const [cancelModal, setCancelModal] = useState(null); // leave object
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  useBodyScrollLock(isCreateOpen || !!reviewModal || !!cancelModal);

  // Mevcut giriş yapmış personeli bul
  const currentEmployee = employees.find(e =>
    (user?.employeeId && e.id === user.employeeId) ||
    e.userId === user?.id ||
    (user?.fullName && e.fullName?.toLowerCase() === user.fullName?.toLowerCase())
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const empRes = await employeesApi.getAll(false).catch(() => ({ success: false, data: [] }));
      if (empRes.success) setEmployees(empRes.data || []);

      let leavesRes;
      if (isAdmin) {
        leavesRes = await leaveApi.getAll();
      } else {
        leavesRes = await leaveApi.getMyLeaves();
      }

      if (leavesRes.success) {
        setLeaves(leavesRes.data || []);
      }
    } catch (err) {
      if (onNotify) onNotify('İzin verileri alınamadı: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  // Yeni talep modalı açıldığında varsayılanları doldur
  const handleOpenCreateModal = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Yarından başlasın
    const tomorrowStr = today.toISOString().split('T')[0];

    setStartDate(tomorrowStr);
    setEndDate(tomorrowStr);
    setStartTime('09:00');
    setEndTime('19:00');
    setLeaveMode('fullday');
    setReason('');
    setFormError(null);

    if (isAdmin && employees.length > 0) {
      setSelectedEmployeeId(employees[0].id.toString());
    } else if (currentEmployee) {
      setSelectedEmployeeId(currentEmployee.id.toString());
    } else {
      setSelectedEmployeeId('');
    }

    setIsCreateOpen(true);
  };

  // Yeni talep gönderme
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    let empId = null;
    if (isAdmin) {
      if (!selectedEmployeeId) {
        setFormError('Lütfen bir personel seçiniz.');
        return;
      }
      empId = parseInt(selectedEmployeeId, 10);
    } else {
      empId = currentEmployee?.id || (selectedEmployeeId ? parseInt(selectedEmployeeId, 10) : null) || user?.employeeId || null;
    }

    let finalStart;
    let finalEnd;

    if (!startDate) {
      setFormError('Lütfen bir tarih seçiniz.');
      return;
    }

    if (leaveMode === 'fullday') {
      finalStart = `${startDate}T00:00:00`;
      finalEnd = `${startDate}T23:59:59`;
    } else if (leaveMode === 'hourly') {
      if (!startTime || !endTime) {
        setFormError('Lütfen başlangıç ve bitiş saatlerini belirtiniz.');
        return;
      }
      if (startTime >= endTime) {
        setFormError('Bitiş saati başlangıç saatinden sonra olmalıdır.');
        return;
      }
      finalStart = `${startDate}T${startTime}:00`;
      finalEnd = `${startDate}T${endTime}:00`;
    } else {
      // range (Çok günlük)
      if (!endDate) {
        setFormError('Lütfen bitiş tarihini seçiniz.');
        return;
      }
      if (startDate > endDate) {
        setFormError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
        return;
      }
      finalStart = `${startDate}T00:00:00`;
      finalEnd = `${endDate}T23:59:59`;
    }

    setSubmitting(true);
    try {
      const payload = {
        startDate: finalStart,
        endDate: finalEnd,
        reason: reason?.trim() || null
      };

      if (empId) {
        payload.employeeId = empId;
      }

      const res = await leaveApi.create(payload);
      if (res.success) {
        if (onNotify) {
          const msg = isAdmin
            ? 'Personel izni başarıyla oluşturuldu ve onaylandı.'
            : 'İzin talebiniz yöneticiye iletildi.';
          onNotify(msg, 'success');
        }
        setIsCreateOpen(false);
        setReason('');
        fetchData();
      } else {
        setFormError(res.message || 'İzin oluşturulamadı.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'İzin oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin İnceleme (Onayla / Reddet)
  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    setReviewSubmitting(true);
    try {
      let res;
      if (reviewModal.action === 'approve') {
        res = await leaveApi.approve(reviewModal.leave.id, adminNote);
      } else {
        res = await leaveApi.reject(reviewModal.leave.id, adminNote);
      }

      if (res.success) {
        if (onNotify) {
          const msg = reviewModal.action === 'approve'
            ? 'İzin talebi onaylandı. Personelin takvimi bu saatlerde kapatıldı.'
            : 'İzin talebi reddedildi.';
          onNotify(msg, 'success');
        }
        setReviewModal(null);
        setAdminNote('');
        fetchData();
      } else {
        if (onNotify) onNotify(res.message || 'İşlem başarısız oldu.', 'error');
      }
    } catch (err) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Hata oluştu.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // İzin İptal Etme (Personel için beklemedeki talep, Admin için beklemedeki veya onaylanmış izin)
  const handleCancelSubmit = async () => {
    if (!cancelModal) return;
    setCancelSubmitting(true);
    try {
      const res = await leaveApi.cancel(cancelModal.id, cancelReason);
      if (res.success) {
        if (onNotify) {
          const msg = cancelModal.status === 1
            ? 'Onaylı izin başarıyla iptal edildi ve personelin randevu slotları tekrar kullanıma açıldı.'
            : 'İzin talebi iptal edildi.';
          onNotify(msg, 'success');
        }
        setCancelModal(null);
        setCancelReason('');
        fetchData();
      } else {
        if (onNotify) onNotify(res.message || 'İptal edilemedi.', 'error');
      }
    } catch (err) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Hata oluştu.', 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Süre formatlama (örn. "1 Gün", "4 Saat (13:00 - 17:00)", "3 Gün")
  const formatDuration = (startStr, endStr) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffMs = e - s;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const isSameDay = s.toDateString() === e.toDateString();

    const isFullDay = (s.getHours() === 0 && e.getHours() === 23) || (diffHours >= 23 && diffHours <= 24);

    if (isSameDay && isFullDay) {
      return '1 Gün (Tam Gün)';
    }

    if (isSameDay) {
      const startHour = s.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const endHour = e.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      return `${diffHours} Saat (${startHour} - ${endHour})`;
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} Gün`;
  };

  const formatDateText = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // İstatistikler
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === 0).length;
    const approved = leaves.filter(l => l.status === 1).length;
    const rejected = leaves.filter(l => l.status === 2 || l.status === 3).length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  // Filtreleme
  const filteredLeaves = useMemo(() => {
    return leaves.filter(item => {
      // Durum filtresi
      if (statusFilter !== 'all' && item.status.toString() !== statusFilter) {
        return false;
      }
      // Personel filtresi (Admin için)
      if (employeeFilter && item.employeeId.toString() !== employeeFilter) {
        return false;
      }
      // Arama filtresi
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empMatch = item.employeeName?.toLowerCase().includes(q);
        const reasonMatch = item.reason?.toLowerCase().includes(q);
        const noteMatch = item.adminNote?.toLowerCase().includes(q);
        if (!empMatch && !reasonMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [leaves, statusFilter, employeeFilter, searchQuery]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Üst Başlık ve Aksiyonlar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '0.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarOff size={24} color="#f59e0b" />
            <span>{isAdmin ? 'Personel İzin Yönetimi' : 'İzin Taleplerim'}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isAdmin
              ? 'Personellerin izin taleplerini inceleyin, onaylayın veya reddedin. Onaylı saatlere randevu alınamaz.'
              : 'Belirli bir gün veya saat aralığı için izin talebinde bulunun. Onaylanan izinlerde takviminiz kapanır.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Temalı Arama Kutusu */}
          <div className="theme-search-box" style={{ width: '230px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="İzin veya personel ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Aramayı Temizle"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem' }}
          >
            <Plus size={16} />
            <span>{isAdmin ? 'Yeni İzin Tanımla' : 'Yeni İzin Talebi'}</span>
          </button>
        </div>
      </div>

      {/* KPI Kartları Grid (Theme Glass Cards) */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* KPI 1: Toplam Talep */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Toplam İzin Kaydı</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {loading ? '...' : stats.total}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Kayıtlı tüm talepler
              </div>
            </div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Calendar size={22} />
            </div>
          </div>
        </div>

        {/* KPI 2: Bekleyen Onay */}
        <div className="glass-card" style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: stats.pending > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-subtle)',
          boxShadow: stats.pending > 0 ? '0 0 20px rgba(245, 158, 11, 0.12)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>Bekleyen Onay</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.35rem' }}>
                {loading ? '...' : stats.pending}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                {stats.pending > 0 ? 'İnceleme bekleyen talep' : 'Bekleyen talep yok'}
              </div>
            </div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <Clock size={22} />
            </div>
          </div>
        </div>

        {/* KPI 3: Onaylanan İzinler */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>Onaylanan İzinler</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', marginTop: '0.35rem' }}>
                {loading ? '...' : stats.approved}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Takvime kapatılan izinler
              </div>
            </div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* KPI 4: Reddedilen / İptal */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>Reddedilen / İptal</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f87171', marginTop: '0.35rem' }}>
                {loading ? '...' : stats.rejected}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Geçersiz kılınan izinler
              </div>
            </div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171'
            }}>
              <XCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="glass-card" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.9rem 1.25rem',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* Durum Sekmeleri */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'Tümü', count: stats.total },
            { id: '0', label: 'Bekleyenler', count: stats.pending, color: '#fbbf24' },
            { id: '1', label: 'Onaylananlar', count: stats.approved, color: '#34d399' },
            { id: '2', label: 'Reddedilenler', count: stats.rejected, color: '#f87171' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sağ Filtre: Personel Seçimi */}
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="form-input-wrapper" style={{ width: '210px' }}>
              <User size={15} className="form-input-icon" />
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="form-select"
                style={{
                  padding: '0.45rem 0.75rem 0.45rem 2.4rem',
                  fontSize: '0.85rem',
                  height: '38px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <option value="">Tüm Personeller</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* İzin Talepleri Tablosu */}
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(245,158,11,0.2)', borderTopColor: 'var(--primary-400)', borderRadius: '50%' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>İzin talepleri yükleniyor...</div>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty-state" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <Coffee size={28} />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              İzin Talebi Bulunamadı
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              {statusFilter !== 'all' || searchQuery || employeeFilter
                ? 'Arama veya filtre kriterlerinize uyan izin kaydı bulunamadı. Filtreleri temizleyebilirsiniz.'
                : isAdmin
                  ? 'Henüz personellerden iletilen bir izin talebi yok. İsterseniz personel adına siz izin tanımlayabilirsiniz.'
                  : 'Şu anda kayıtlı bir izin talebiniz bulunmuyor. Yeni bir izin oluşturmak için butona tıklayabilirsiniz.'}
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}
            >
              <Plus size={15} />
              <span>Yeni İzin Oluştur</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personel</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>İzin Tarihi & Aralığı</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Süre</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mazeret / Gerekçe</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((item) => {
                  const isPending = item.status === 0;
                  const isApproved = item.status === 1;
                  const isRejected = item.status === 2;
                  const isCancelled = item.status === 3;

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}
                      className="table-row-hover"
                    >
                      {/* Personel */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--primary-gradient)',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            flexShrink: 0
                          }}>
                            {item.employeeName?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {item.employeeName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Talep: {formatDateText(item.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* İzin Tarihi & Aralığı */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            <Calendar size={14} color="#f59e0b" />
                            <span>{formatDateText(item.startDate)}</span>
                            {item.startDate.split('T')[0] !== item.endDate.split('T')[0] && (
                              <>
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                <span>{formatDateText(item.endDate)}</span>
                              </>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>
                              {new Date(item.startDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              {' '}-{' '}
                              {new Date(item.endDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Süre */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}>
                          {formatDuration(item.startDate, item.endDate)}
                        </span>
                      </td>

                      {/* Mazeret / Açıklama */}
                      <td style={{ padding: '1rem', maxWidth: '300px' }}>
                        <div style={{
                          fontSize: '0.85rem',
                          color: item.reason ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontStyle: item.reason ? 'normal' : 'italic',
                          lineHeight: 1.4
                        }}>
                          {item.reason || 'Mazeret belirtilmedi'}
                        </div>
                        {item.adminNote && (
                          <div style={{
                            marginTop: '0.4rem',
                            fontSize: '0.75rem',
                            color: isApproved ? '#34d399' : '#f87171',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: isApproved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            width: 'fit-content'
                          }}>
                            <Info size={12} style={{ flexShrink: 0 }} />
                            <span>Not: {item.adminNote}</span>
                          </div>
                        )}
                      </td>

                      {/* Durum Rozeti */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        {isPending && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            <Clock size={13} />
                            <span>Beklemede</span>
                          </span>
                        )}
                        {isApproved && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            <CheckCircle2 size={13} />
                            <span>Onaylandı</span>
                          </span>
                        )}
                        {isRejected && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            <XCircle size={13} />
                            <span>Reddedildi</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            <Ban size={13} />
                            <span>İptal Edildi</span>
                          </span>
                        )}
                      </td>

                      {/* İşlemler */}
                      <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isAdmin && isPending && (
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button
                              onClick={() => {
                                setAdminNote('');
                                setReviewModal({ leave: item, action: 'approve' });
                              }}
                              className="btn btn-sm"
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              title="Talebi Kabul Et"
                            >
                              <Check size={14} />
                              <span>Kabul Et</span>
                            </button>

                            <button
                              onClick={() => {
                                setAdminNote('');
                                setReviewModal({ leave: item, action: 'reject' });
                              }}
                              className="btn btn-sm"
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              title="Talebi Reddet"
                            >
                              <X size={14} />
                              <span>Reddet</span>
                            </button>
                          </div>
                        )}

                        {/* Bekleyen Talep - Personel veya Admin İptal Edebilir */}
                        {isPending && (!isAdmin || (currentEmployee && item.employeeId === currentEmployee.id)) && (
                          <button
                            onClick={() => {
                              setCancelReason('');
                              setCancelModal(item);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem' }}
                            title="Talebi İptal Et"
                          >
                            <Ban size={13} />
                            <span>İptal Et</span>
                          </button>
                        )}

                        {/* Onaylı İzin - Admin İptal Edebilir */}
                        {item.status === 1 && isAdmin && (
                          <button
                            onClick={() => {
                              setCancelReason('');
                              setCancelModal(item);
                            }}
                            className="btn btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.75rem',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: 600
                            }}
                            title="Onaylı İzni İptal Et (Randevu Slotlarını Aç)"
                          >
                            <Ban size={13} />
                            <span>İzni İptal Et</span>
                          </button>
                        )}

                        {!isPending && !(item.status === 1 && isAdmin) && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {item.reviewedAt ? `İşlem: ${formatDateText(item.reviewedAt)}` : 'Tamamlandı'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* YENİ İZİN MODALI (STANDARD THEME MODAL) */}
      {isCreateOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                <CalendarOff size={20} color="#f59e0b" />
                <span>{isAdmin ? 'Yeni Personel İzni Tanımla' : 'Yeni İzin Talebi Oluştur'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {formError && (
                  <div className="alert-card alert-card-error">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>{formError}</div>
                  </div>
                )}

                {/* Personel Seçimi (Admin için) */}
                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">
                      Personel Seçimi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <User size={16} className="form-input-icon" />
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="form-select"
                        style={{ paddingLeft: '2.75rem' }}
                        required
                      >
                        <option value="">Personel Seçiniz...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* İzin Türü Seçimi (Segmented Card Bar) */}
                <div className="form-group">
                  <label className="form-label">İzin Türü</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    background: 'var(--bg-input)',
                    padding: '5px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {[
                      { id: 'fullday', label: 'Tam Günlük', icon: Calendar },
                      { id: 'hourly', label: 'Saatlik İzin', icon: Clock },
                      { id: 'range', label: 'Çoklu Gün', icon: CalendarOff }
                    ].map(t => {
                      const Icon = t.icon;
                      const isSelected = leaveMode === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setLeaveMode(t.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            padding: '0.65rem 0.5rem',
                            border: isSelected ? '1px solid var(--border-active)' : '1px solid transparent',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'var(--primary-gradient)' : 'transparent',
                            color: isSelected ? '#000' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSelected ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none'
                          }}
                        >
                          <Icon size={15} />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tarih ve Saat Alanları */}
                {leaveMode === 'fullday' && (
                  <div className="form-group">
                    <label className="form-label">
                      İzin Tarihi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <Calendar size={16} className="form-input-icon" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setEndDate(e.target.value);
                        }}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                )}

                {leaveMode === 'hourly' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        İzin Tarihi <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <Calendar size={16} className="form-input-icon" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setEndDate(e.target.value);
                          }}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Başlangıç Saati</label>
                        <div className="form-input-wrapper">
                          <Clock size={16} className="form-input-icon" />
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bitiş Saati</label>
                        <div className="form-input-wrapper">
                          <Clock size={16} className="form-input-icon" />
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {leaveMode === 'range' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Başlangıç Tarihi <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <Calendar size={16} className="form-input-icon" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Bitiş Tarihi <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="form-input-wrapper">
                        <Calendar size={16} className="form-input-icon" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Mazeret / İzin Açıklaması */}
                <div className="form-group">
                  <label className="form-label">İzin Mazereti / Açıklama (İsteğe Bağlı)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Örn: Yıllık izin, sağlık kontrolü, resmi işlemler..."
                    className="form-input no-icon"
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={submitting}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '130px' }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-sm" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>{isAdmin ? 'İzni Onaylı Ekle' : 'Talebi Gönder'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ADMİN ONAY / RET KARAR MODALI */}
      {reviewModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setReviewModal(null); }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                margin: 0,
                color: reviewModal.action === 'approve' ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {reviewModal.action === 'approve' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                <span>{reviewModal.action === 'approve' ? 'İzin Talebini Onayla' : 'İzin Talebini Reddet'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'var(--bg-input)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div><strong>Personel:</strong> {reviewModal.leave.employeeName}</div>
                <div><strong>İzin Aralığı:</strong> {formatDateText(reviewModal.leave.startDate)} — {formatDuration(reviewModal.leave.startDate, reviewModal.leave.endDate)}</div>
                {reviewModal.leave.reason && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <strong>Mazeret:</strong> {reviewModal.leave.reason}
                  </div>
                )}
              </div>

              {reviewModal.action === 'approve' && (
                <div style={{
                  fontSize: '0.85rem',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>Onaylandığında personelin takvimi bu saatlerde randevu alımına kapatılacaktır.</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {reviewModal.action === 'approve' ? 'Onay Notu (İsteğe Bağlı):' : 'Reddetme Gerekçesi (İsteğe Bağlı):'}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={reviewModal.action === 'approve' ? 'Örn: Onaylandı, iyi tatiller...' : 'Örn: Yoğun randevu talebi nedeniyle uygun değil...'}
                  className="form-input no-icon"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="btn btn-secondary btn-sm"
                disabled={reviewSubmitting}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={reviewSubmitting}
                className={reviewModal.action === 'approve' ? 'btn btn-primary btn-sm' : 'btn btn-danger btn-sm'}
                style={{
                  minWidth: '140px',
                  background: reviewModal.action === 'approve' ? 'var(--primary-gradient)' : '#ef4444'
                }}
              >
                {reviewSubmitting ? 'İşleniyor...' : reviewModal.action === 'approve' ? 'Onayla ve Kilitle' : 'Talebi Reddet'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* İPTAL ONAY MODALI */}
      {cancelModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCancelModal(null); }}>
          <div className="modal-content" style={{ maxWidth: cancelModal.status === 1 ? '480px' : '420px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
                <Ban size={18} />
                <span>{cancelModal.status === 1 ? 'Onaylı İzni İptal Et' : 'İzin Talebini İptal Et'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.4rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'var(--bg-input)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div><strong>Personel:</strong> {cancelModal.employeeName}</div>
                <div><strong>İzin Aralığı:</strong> {formatDateText(cancelModal.startDate)} — {formatDuration(cancelModal.startDate, cancelModal.endDate)}</div>
                {cancelModal.reason && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <strong>Mazeret:</strong> {cancelModal.reason}
                  </div>
                )}
              </div>

              {cancelModal.status === 1 ? (
                <div style={{
                  fontSize: '0.85rem',
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  lineHeight: 1.4
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>
                    Bu izin <strong>Onaylandı</strong> durumundadır. İptal ettiğinizde personelin bu saatlerdeki randevu takvimi müşterilere yeniden açılacaktır.
                  </span>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Beklemede olan bu izin talebini iptal etmek istediğinize emin misiniz?
                </p>
              )}

              {isAdmin && cancelModal.status === 1 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    İptal Gerekçesi (İsteğe Bağlı):
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Örn: Personel göreve geri çağrıldı / takvim güncellendi..."
                    className="form-input no-icon"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="btn btn-secondary btn-sm"
                disabled={cancelSubmitting}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                className="btn btn-danger btn-sm"
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? 'İptal Ediliyor...' : (cancelModal.status === 1 ? 'Evet, Onaylı İzni İptal Et' : 'Evet, İptal Et')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
