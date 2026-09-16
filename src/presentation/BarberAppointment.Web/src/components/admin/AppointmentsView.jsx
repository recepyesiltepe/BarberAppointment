import React, { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle2, XCircle, Clock, Search, Filter, User, Scissors, AlertCircle, X, ShieldCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { appointmentsApi, servicesApi, employeesApi, usersApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';
import { formatTurkishPhone } from '../../utils/phoneUtils';

export const AppointmentsView = ({ onNotify }) => {
  const { user, roleName } = useAuth();
  const isAdmin = roleName === 'Admin' || user?.role === 2;
  const isEmployee = roleName === 'Employee' || user?.role === 1;

  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mevcut giriş yapmış personeli bul
  const currentEmployee = employees.find(e => e.userId === user?.id || (user?.email && e.fullName === user?.fullName));

  // Filter States
  const [timeTab, setTimeTab] = useState('all'); // 'all' | 'upcoming' | 'history'
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('nearest'); // 'nearest' (En Yakın Randevu Başa) | 'farthest' (En İleri Randevu Başa)

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newStartAt, setNewStartAt] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [apptRes, srvRes, empRes, userRes] = await Promise.all([
        appointmentsApi.getAll(),
        servicesApi.getAll(true),
        employeesApi.getAll(true),
        isAdmin ? usersApi.getAll().catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: true, data: [] })
      ]);

      if (apptRes.success) setAppointments(apptRes.data || []);
      if (srvRes.success) setServices(srvRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
      if (userRes.success) setUsers(userRes.data || []);
    } catch (err) {
      if (onNotify) onNotify('Randevular yüklenirken hata: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleComplete = async (id) => {
    try {
      const res = await appointmentsApi.complete(id);
      if (res.success) {
        if (onNotify) onNotify('Randevu tamamlandı olarak işaretlendi.', 'success');
        fetchAllData();
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'İşlem başarısız.', 'error');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) return;

    try {
      const res = await appointmentsApi.cancel(id);
      if (res.success) {
        if (onNotify) onNotify('Randevu başarıyla iptal edildi.', 'success');
        fetchAllData();
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'İptal işlemi başarısız.', 'error');
    }
  };

  const handleOpenCreate = () => {
    const firstUser = users.length > 0 ? users[0] : null;
    setNewUserId(firstUser ? firstUser.id : 1);

    const targetEmp = (isEmployee && currentEmployee) ? currentEmployee : employees[0];
    const empId = targetEmp ? targetEmp.id : (employees.length > 0 ? employees[0].id : 1);
    setNewEmployeeId(empId);

    const empServices = targetEmp?.services && targetEmp.services.length > 0 ? targetEmp.services : services;
    setNewServiceId(empServices.length > 0 ? empServices[0].id : (services.length > 0 ? services[0].id : 1));
    
    // Varsayılan olarak yarın saat 11:00 (Yerel saat bileşenleriyle oluşturulur, UTC sapması önlenir)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setNewStartAt(`${yyyy}-${mm}-${dd}T11:00`);
    
    setNewNotes('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleEmployeeChange = (empId) => {
    setNewEmployeeId(empId);
    const emp = employees.find(e => e.id === Number(empId));
    const empServices = emp?.services && emp.services.length > 0 ? emp.services : services;
    if (empServices.length > 0 && !empServices.some(s => s.id === Number(newServiceId))) {
      setNewServiceId(empServices[0].id);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!newStartAt) {
      setFormError('Lütfen randevu tarih ve saatini seçiniz.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedStartAt = newStartAt.length === 16 ? newStartAt + ':00' : newStartAt;
      const res = await appointmentsApi.create({
        userId: Number(newUserId),
        employeeId: Number(newEmployeeId),
        serviceId: Number(newServiceId),
        startAt: formattedStartAt,
        notes: newNotes.trim() || undefined
      });

      if (res.success) {
        if (onNotify) onNotify('Yeni randevu başarıyla oluşturuldu!', 'success');
        setIsCreateModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      setFormError(err.message || 'Randevu oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 2: // Confirmed / Onaylandı
        return <span className="badge badge-customer"><CheckCircle2 size={12} /> Onaylandı</span>;
      case 3: // Completed / Tamamlandı
        return <span className="badge badge-employee"><CheckCircle2 size={12} /> Tamamlandı</span>;
      case 4: // Cancelled / İptal
        return <span style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: 'var(--radius-full)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><XCircle size={12} /> İptal Edildi</span>;
      case 1: // Pending / Bekliyor
      default:
        return <span className="badge badge-admin"><Clock size={12} /> Bekliyor</span>;
    }
  };

  const nowTime = Date.now();
  const upcomingAppointmentsCount = appointments.filter(a => new Date(a.startAt).getTime() >= nowTime).length;
  const pastAppointmentsCount = appointments.filter(a => new Date(a.startAt).getTime() < nowTime).length;

  const filteredAppointments = appointments
    .filter(a => {
      const isPast = new Date(a.startAt).getTime() < nowTime;
      if (timeTab === 'upcoming' && isPast) return false;
      if (timeTab === 'history' && !isPast) return false;
      if (filterEmployeeId && a.employeeId !== Number(filterEmployeeId)) return false;
      if (filterStatus && a.status !== Number(filterStatus)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchCustomer = a.customerName && a.customerName.toLowerCase().includes(query);
        const matchStaff = a.employeeName && a.employeeName.toLowerCase().includes(query);
        const matchService = a.serviceName && a.serviceName.toLowerCase().includes(query);
        if (!matchCustomer && !matchStaff && !matchService) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.startAt).getTime();
      const timeB = new Date(b.startAt).getTime();
      if (sortOrder === 'farthest') {
        return timeB - timeA;
      }
      // 'nearest' (Varsayılan):
      // Eğer 'all' sekmesindeyse: önce yaklaşanlar (artan sıra: tarihi ve saati en yakın olan başta),
      // ardından geçmiş randevular (en son gerçekleşen geçmiş başta)
      if (timeTab === 'all') {
        const aIsFuture = timeA >= nowTime;
        const bIsFuture = timeB >= nowTime;
        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        if (aIsFuture && bIsFuture) return timeA - timeB;
        return timeB - timeA;
      }
      // 'upcoming': en yakın randevu en başta (artan kronolojik sıra)
      if (timeTab === 'upcoming') {
        return timeA - timeB;
      }
      // 'history': en son geçmiş randevu en başta (azalan kronolojik sıra)
      return timeB - timeA;
    });

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--primary-400)" />
            <span>Randevu Yönetimi</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {isEmployee
              ? 'Size atanan randevuları, randevu durumlarını ve müşteri taleplerini denetleyin.'
              : 'Tüm salon randevularını, saat çakışmalarını ve durumlarını denetleyin.'}
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleOpenCreate} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} />
              <span>Yeni Randevu Oluştur</span>
            </button>
          </div>
        )}
      </div>

      {/* Time Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setTimeTab('all')}
          className={`btn btn-sm ${timeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span>Tüm Randevular</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '10px',
            background: timeTab === 'all' ? 'rgba(0,0,0,0.25)' : 'var(--card-nested-bg)',
            color: 'var(--text-primary)'
          }}>
            {appointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTimeTab('upcoming')}
          className={`btn btn-sm ${timeTab === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Clock size={14} />
          <span>Yaklaşan Randevular</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '10px',
            background: timeTab === 'upcoming' ? '#fbbf24' : 'rgba(245, 158, 11, 0.15)',
            color: timeTab === 'upcoming' ? '#000' : '#fbbf24',
            fontWeight: 700
          }}>
            {upcomingAppointmentsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTimeTab('history')}
          className={`btn btn-sm ${timeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span>Geçmiş Randevular</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '10px',
            background: timeTab === 'history' ? 'rgba(0,0,0,0.25)' : 'var(--card-nested-bg)',
            color: 'var(--text-primary)'
          }}>
            {pastAppointmentsCount}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div className="theme-search-box" style={{ flex: '1 1 240px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Müşteri, personel veya hizmet ara..."
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

        {isAdmin ? (
          <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
            <select
              className="form-select"
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
            >
              <option value="">Tüm Personeller</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#38bdf8',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            <ShieldCheck size={16} />
            <span>Personel: <strong>{currentEmployee?.fullName || user?.fullName || 'Siz'}</strong></span>
          </div>
        )}

        <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="1">Bekliyor</option>
            <option value="2">Onaylandı</option>
            <option value="3">Tamamlandı</option>
            <option value="4">İptal Edildi</option>
          </select>
        </div>

        <div style={{ minWidth: '190px', flex: '1 1 190px' }}>
          <select
            className="form-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <option value="nearest">⏱ En Yakın Randevu Başa</option>
            <option value="farthest">📅 En İleri Tarih Başa</option>
          </select>
        </div>

        {(filterEmployeeId || filterStatus || searchQuery || sortOrder !== 'nearest') && (
          <button
            onClick={() => { setFilterEmployeeId(''); setFilterStatus(''); setSearchQuery(''); setSortOrder('nearest'); }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.85rem' }}
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Appointments Table */}
      <div className="table-responsive">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(245,158,11,0.2)', borderTopColor: 'var(--primary-400)', borderRadius: '50%' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Randevu takvimi yükleniyor...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={28} />
            </div>
            <div className="empty-state-title">Randevu Bulunamadı</div>
            <div className="empty-state-desc">
              Seçilen kriterlere uygun randevu kaydı bulunamadı. Filtreleri temizleyebilir veya yeni randevu oluşturabilirsiniz.
            </div>
            {(filterEmployeeId || filterStatus || searchQuery || sortOrder !== 'nearest') && (
              <button
                onClick={() => { setFilterEmployeeId(''); setFilterStatus(''); setSearchQuery(''); setSortOrder('nearest'); }}
                className="btn btn-secondary btn-sm"
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Müşteri</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personel</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hizmet & Fiyat</th>
                <th
                  onClick={() => setSortOrder(prev => prev === 'nearest' ? 'farthest' : 'nearest')}
                  style={{
                    padding: '1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="Tarihe göre sıralamayı tersine çevir"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>Randevu Zamanı</span>
                    {sortOrder === 'nearest' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                        <ArrowUp size={13} /> En Yakın
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                        <ArrowDown size={13} /> En İleri
                      </span>
                    )}
                  </div>
                </th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((a) => {
                const start = new Date(a.startAt);
                const end = new Date(a.endAt);
                const dateStr = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
                const timeStr = `${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.customerName}</div>
                      {a.customerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTurkishPhone(a.customerPhone)}</div>}
                    </td>
                    <td style={{ padding: '1rem', color: '#0284c7', fontWeight: 500 }}>
                      {a.employeeName}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{a.serviceName}</div>
                      <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>{a.price} ₺ ({a.durationMinutes} dk)</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>{dateStr}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} /> {timeStr}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(a.status)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {a.status !== 3 && a.status !== 4 && (
                          <>
                            <button
                              onClick={() => handleComplete(a.id)}
                              className="btn btn-secondary btn-sm"
                              title="Tamamlandı Olarak İşaretle"
                              style={{ padding: '0.35rem 0.6rem', color: '#34d399' }}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => handleCancel(a.id)}
                              className="btn btn-ghost btn-sm"
                              title="İptal Et"
                              style={{ padding: '0.35rem 0.6rem', color: '#f87171' }}
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Appointment Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Calendar size={20} color="var(--primary-400)" />
                <span>Yeni Randevu Oluştur</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-card alert-card-error">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>{formError}</div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Müşteri Seçimi</label>
                  <select
                    className="form-select"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    required
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                    ))}
                    {users.length === 0 && <option value="1">Varsayılan Müşteri</option>}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Personel</label>
                    {isEmployee ? (
                      <input
                        type="text"
                        className="form-input no-icon"
                        value={currentEmployee?.fullName || user?.fullName || 'Siz'}
                        disabled
                        style={{ opacity: 0.85, cursor: 'not-allowed' }}
                      />
                    ) : (
                      <select
                        className="form-select"
                        value={newEmployeeId}
                        onChange={(e) => handleEmployeeChange(e.target.value)}
                        required
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hizmet</label>
                    <select
                      className="form-select"
                      value={newServiceId}
                      onChange={(e) => setNewServiceId(e.target.value)}
                      required
                    >
                      {(() => {
                        const selEmp = employees.find(e => e.id === Number(newEmployeeId));
                        const empSrvs = selEmp?.services && selEmp.services.length > 0 ? selEmp.services : services;
                        return empSrvs.map(srv => (
                          <option key={srv.id} value={srv.id}>{srv.name} ({srv.price} ₺)</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Randevu Başlangıç Tarihi ve Saati</label>
                  <input
                    type="datetime-local"
                    className="form-input no-icon"
                    value={newStartAt}
                    onChange={(e) => setNewStartAt(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notlar (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="Örn: Özel saç modeli isteği"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={submitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-sm" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Randevuyu Onayla</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
