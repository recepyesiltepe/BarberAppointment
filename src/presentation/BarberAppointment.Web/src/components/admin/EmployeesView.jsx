import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Plus, Edit2, Trash2, Search, Scissors, Shield, Check, X, AlertCircle, Clock, Calendar } from 'lucide-react';
import { employeesApi, servicesApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Pzt', fullLabel: 'Pazartesi' },
  { id: 2, label: 'Sal', fullLabel: 'Salı' },
  { id: 3, label: 'Çar', fullLabel: 'Çarşamba' },
  { id: 4, label: 'Per', fullLabel: 'Perşembe' },
  { id: 5, label: 'Cum', fullLabel: 'Cuma' },
  { id: 6, label: 'Cmt', fullLabel: 'Cumartesi' },
  { id: 0, label: 'Paz', fullLabel: 'Pazar' }
];

const getOffDaysText = (selectedDays) => {
  const allDays = [1, 2, 3, 4, 5, 6, 0];
  const off = allDays.filter(d => !selectedDays.includes(d));
  if (off.length === 0) return 'Yok (7 Gün)';
  return off.map(d => DAYS_OF_WEEK.find(item => item.id === d)?.fullLabel).join(', ');
};

const formatEmployeeDays = (emp) => {
  let daysList = [];
  if (emp.workingDays) {
    daysList = emp.workingDays.split(',').map(Number).filter(n => !isNaN(n));
  } else if (emp.weeklyOffDay !== null && emp.weeklyOffDay !== undefined) {
    daysList = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== emp.weeklyOffDay);
  } else {
    daysList = [1, 2, 3, 4, 5, 6];
  }

  if (daysList.length === 7) return 'Haftanın 7 Günü';
  if (daysList.length === 6 && !daysList.includes(0)) return 'Pzt - Cmt (Pazar İzinli)';
  if (daysList.length === 5 && !daysList.includes(0) && !daysList.includes(6)) return 'Hafta İçi (5 Gün)';
  
  return daysList
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => DAYS_OF_WEEK.find(item => item.id === d)?.label)
    .join(', ');
};

export const EmployeesView = ({ onNotify }) => {
  const { user, roleName } = useAuth();
  const isAdmin = roleName === 'Admin' || user?.role === 2;
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null = add, object = edit
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('19:00');
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5, 6]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useBodyScrollLock(isModalOpen);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, srvRes] = await Promise.all([
        employeesApi.getAll(false),
        servicesApi.getAll(true)
      ]);

      if (empRes.success) setEmployees(empRes.data || []);
      if (srvRes.success) setServices(srvRes.data || []);
    } catch (err) {
      if (onNotify) onNotify('Personel verileri yüklenirken hata: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleWorkingDay = (dayId) => {
    setWorkingDays(prev => {
      if (prev.includes(dayId)) {
        if (prev.length <= 1) {
          return prev; // En az bir çalışma günü seçili olmalı
        }
        return prev.filter(d => d !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setEditingEmployee(null);
    setFullName('');
    setTitle('Kuaför & Stilist');
    setSelectedServiceIds([]);
    setWorkStartTime('09:00');
    setWorkEndTime('19:00');
    setWorkingDays([1, 2, 3, 4, 5, 6]);
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    if (!isAdmin) return;
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setTitle(emp.title || '');
    const assignedIds = emp.services ? emp.services.map(s => s.id) : [];
    setSelectedServiceIds(assignedIds);
    setWorkStartTime(emp.workStartTime ? emp.workStartTime.slice(0, 5) : '09:00');
    setWorkEndTime(emp.workEndTime ? emp.workEndTime.slice(0, 5) : '19:00');

    if (emp.workingDays) {
      const days = emp.workingDays.split(',').map(Number).filter(n => !isNaN(n));
      setWorkingDays(days.length > 0 ? days : [1, 2, 3, 4, 5, 6]);
    } else if (emp.weeklyOffDay !== null && emp.weeklyOffDay !== undefined) {
      setWorkingDays([0, 1, 2, 3, 4, 5, 6].filter(d => d !== emp.weeklyOffDay));
    } else {
      setWorkingDays([1, 2, 3, 4, 5, 6]);
    }

    setIsActive(emp.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleService = (serviceId) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleDelete = async (id, name) => {
    if (!isAdmin) return;
    if (!window.confirm(`"${name}" personelini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await employeesApi.delete(id);
      if (res.success) {
        if (onNotify) onNotify(`"${name}" personeli başarıyla silindi.`, 'success');
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'Silme işlemi başarısız.', 'error');
    } finally {
      fetchData();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Personel adı soyadı zorunludur.');
      return;
    }

    if (!workStartTime || !workEndTime) {
      setFormError('Lütfen mesai başlangıç ve bitiş saatlerini giriniz.');
      return;
    }

    if (workStartTime >= workEndTime) {
      setFormError('Mesai bitiş saati başlangıç saatinden sonra olmalıdır.');
      return;
    }

    if (workingDays.length === 0) {
      setFormError('Lütfen en az bir çalışma günü seçiniz.');
      return;
    }

    setSubmitting(true);
    try {
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      const offDays = allDays.filter(d => !workingDays.includes(d));
      const computedWeeklyOffDay = offDays.length > 0 ? offDays[0] : null;
      const workingDaysStr = workingDays.slice().sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).join(',');

      const payload = {
        fullName: fullName.trim(),
        title: title.trim(),
        workStartTime: workStartTime.length === 5 ? workStartTime + ':00' : workStartTime,
        workEndTime: workEndTime.length === 5 ? workEndTime + ':00' : workEndTime,
        weeklyOffDay: computedWeeklyOffDay,
        workingDays: workingDaysStr,
        serviceIds: selectedServiceIds
      };

      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, {
          ...payload,
          isActive
        });

        if (onNotify) onNotify('Personel bilgileri, mesai saatleri ve çalışma günleri güncellendi.', 'success');
      } else {
        await employeesApi.create(payload);

        if (onNotify) onNotify('Yeni personel başarıyla eklendi.', 'success');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'İşlem başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (e.title && e.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={24} color="#38bdf8" />
            <span>Personel Yönetimi</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Kuaför ekibini, unvanlarını ve verebilecekleri hizmetleri yönetin.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="theme-search-box" style={{ width: '230px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Personel ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Aramayı Temizle"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {isAdmin && (
            <button onClick={handleOpenAdd} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} />
              <span>Yeni Personel Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Personeller yükleniyor...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Eşleşen personel bulunamadı.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personel</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unvan</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verdiği Hizmetler</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mesai & Günler</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</th>
                  {isAdmin && (
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>İşlemler</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#fff',
                          fontSize: '0.95rem'
                        }}>
                          {emp.fullName?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#38bdf8', fontWeight: 500, fontSize: '0.9rem' }}>
                      {emp.title || 'Usta Kuaför'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '300px' }}>
                        {emp.services && emp.services.length > 0 ? (
                          emp.services.map(s => (
                            <span key={s.id} style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-secondary)'
                            }}>
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hizmet atanmadı</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Clock size={13} color="var(--primary-400)" />
                          <span>{emp.workStartTime?.slice(0, 5) || '09:00'} - {emp.workEndTime?.slice(0, 5) || '19:00'}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatEmployeeDays(emp)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {emp.isActive ? (
                        <span className="badge badge-customer">Aktif</span>
                      ) : (
                        <span style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 'var(--radius-full)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          Pasif
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="btn btn-secondary btn-sm"
                            title="Düzenle / Hizmet Ata"
                            style={{ padding: '0.35rem 0.6rem' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.fullName)}
                            className="btn btn-ghost btn-sm"
                            title="Sil"
                            style={{ padding: '0.35rem 0.6rem', color: '#f87171' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && isAdmin && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <User size={20} color="#38bdf8" />
                <span>{editingEmployee ? 'Personeli Düzenle & Hizmet Ata' : 'Yeni Personel Ekle'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-card alert-card-error">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>{formError}</div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Ad Soyad</label>
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="Örn: Hasan Usta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unvan / Rol</label>
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="Örn: Kıdemli Kuaför, Sakal Uzmanı"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Working Hours Interval */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} color="var(--primary-400)" />
                      <span>Mesai Başlangıç</span>
                    </label>
                    <input
                      type="time"
                      className="form-input no-icon"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} color="var(--primary-400)" />
                      <span>Mesai Bitiş</span>
                    </label>
                    <input
                      type="time"
                      className="form-input no-icon"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Working Days Selector */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--primary-400)" />
                      <span>Haftalık Çalışma Günleri ({workingDays.length} Gün)</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      İzin: <strong style={{ color: '#f87171' }}>{getOffDaysText(workingDays)}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                    {DAYS_OF_WEEK.map(day => {
                      const isWorking = workingDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleWorkingDay(day.id)}
                          title={`${day.fullLabel}: ${isWorking ? 'Çalışıyor' : 'İzinli (Tıklayarak değiştir)'}`}
                          style={{
                            padding: '0.55rem 0.2rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isWorking ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                            background: isWorking ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            color: isWorking ? '#38bdf8' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.2rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{day.label}</span>
                          <span style={{ fontSize: '0.65rem', opacity: isWorking ? 1 : 0.6, fontWeight: 500 }}>
                            {isWorking ? 'Aktif' : 'İzin'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Service Assignment Checklist */}
                <div className="form-group">
                  <label className="form-label">Yetkili Olduğu Hizmetler ({selectedServiceIds.length} Seçildi)</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {services.map(srv => {
                      const isSelected = selectedServiceIds.includes(srv.id);
                      return (
                        <div
                          key={srv.id}
                          onClick={() => handleToggleService(srv.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: isSelected ? 'none' : '1px solid var(--border-medium)',
                            background: isSelected ? '#38bdf8' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000'
                          }}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: '0.85rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {srv.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {editingEmployee && (
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 1rem' }}>
                    <input
                      type="checkbox"
                      id="isEmpActiveCheck"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#38bdf8' }}
                    />
                    <label htmlFor="isEmpActiveCheck" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Personel Aktif Olarak Randevu Alabilir
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    <span>{editingEmployee ? 'Güncelle' : 'Personeli Ekle'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
