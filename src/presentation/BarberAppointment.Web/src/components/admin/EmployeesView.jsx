import React, { useState, useEffect } from 'react';
import { User, Plus, Edit2, Trash2, Search, Scissors, Shield, Check, X, AlertCircle } from 'lucide-react';
import { employeesApi, servicesApi } from '../../api/barberApi';

export const EmployeesView = ({ onNotify }) => {
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
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFullName('');
    setTitle('Kuaför & Stilist');
    setSelectedServiceIds([]);
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setTitle(emp.title || '');
    // Eğer serviste atanmış hizmetler varsa
    const assignedIds = emp.services ? emp.services.map(s => s.id) : [];
    setSelectedServiceIds(assignedIds);
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
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Personel adı soyadı zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEmployee) {
        // Personel ve yetkili olduğu hizmetleri güncelle
        await employeesApi.update(editingEmployee.id, {
          fullName,
          title,
          isActive,
          serviceIds: selectedServiceIds
        });

        if (onNotify) onNotify('Personel bilgileri ve hizmetleri başarıyla güncellendi.', 'success');
      } else {
        // Yeni personel oluştur
        await employeesApi.create({
          fullName,
          title,
          serviceIds: selectedServiceIds
        });

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
          <div className="form-input-wrapper" style={{ width: '220px' }}>
            <Search size={16} className="form-input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Personel ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.55rem 1rem 0.55rem 2.5rem', fontSize: '0.875rem' }}
            />
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Yeni Personel Ekle</span>
          </button>
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
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>İşlemler</th>
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
                          <div style={{ fontWeight: 600, color: '#fff' }}>{emp.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#38bdf8', fontWeight: 500, fontSize: '0.9rem' }}>
                      {emp.title || 'Usta Kuaför'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '320px' }}>
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
                      {emp.isActive ? (
                        <span className="badge badge-customer">Aktif</span>
                      ) : (
                        <span style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 'var(--radius-full)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          Pasif
                        </span>
                      )}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-medium)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="#38bdf8" />
              <span>{editingEmployee ? 'Personeli Düzenle & Hizmet Ata' : 'Yeni Personel Ekle'}</span>
            </h3>

            {formError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
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

              {/* Service Assignment Checklist */}
              <div className="form-group">
                <label className="form-label">Yetkili Olduğu Hizmetler ({selectedServiceIds.length} Seçildi)</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
                        <span style={{ fontSize: '0.85rem', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                          {srv.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingEmployee && (
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 1.25rem' }}>
                  <input
                    type="checkbox"
                    id="isEmpActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                  <label htmlFor="isEmpActiveCheck" style={{ fontSize: '0.9rem', color: '#fff', cursor: 'pointer' }}>
                    Personel Aktif Olarak Randevu Alabilir
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                >
                  {submitting ? 'Kaydediliyor...' : editingEmployee ? 'Güncelle' : 'Personeli Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
