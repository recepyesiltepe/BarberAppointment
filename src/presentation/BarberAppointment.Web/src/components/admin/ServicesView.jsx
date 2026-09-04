import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Edit2, Trash2, Search, Clock, DollarSign, Check, X, AlertCircle, Sparkles } from 'lucide-react';
import { servicesApi } from '../../api/barberApi';

export const ServicesView = ({ onNotify }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null); // null = add, object = edit
  const [formData, setFormData] = useState({ name: '', durationMinutes: 30, price: 150, isActive: true });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.getAll(false);
      if (res.success) {
        setServices(res.data || []);
      }
    } catch (err) {
      if (onNotify) onNotify('Hizmetler yüklenirken hata oluştu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({ name: '', durationMinutes: 30, price: 150, isActive: true });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv) => {
    setEditingService(srv);
    setFormData({
      name: srv.name,
      durationMinutes: srv.durationMinutes,
      price: srv.price,
      isActive: srv.isActive
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (srv) => {
    try {
      const newStatus = !srv.isActive;
      const res = await servicesApi.update(srv.id, {
        name: srv.name,
        durationMinutes: srv.durationMinutes,
        price: srv.price,
        isActive: newStatus
      });
      if (res.success) {
        if (onNotify) onNotify(`"${srv.name}" hizmeti ${newStatus ? 'aktif' : 'pasif'} duruma getirildi.`, 'success');
        fetchServices();
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'Durum güncellenemedi.', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" hizmetini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await servicesApi.delete(id);
      if (res.success) {
        if (onNotify) onNotify(res.message || `"${name}" hizmeti başarıyla silindi.`, 'success');
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('bulunamadı')) {
        if (onNotify) onNotify(`"${name}" hizmeti zaten silinmişti. Liste güncellendi.`, 'info');
      } else {
        if (onNotify) onNotify(err.message || 'Silme işlemi başarısız.', 'error');
      }
    } finally {
      fetchServices();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Hizmet adı zorunludur.');
      return;
    }
    if (formData.durationMinutes < 5 || formData.durationMinutes > 300) {
      setFormError('Süre 5 ile 300 dakika arasında olmalıdır.');
      return;
    }
    if (formData.price <= 0) {
      setFormError('Fiyat 0 dan büyük olmalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingService) {
        const res = await servicesApi.update(editingService.id, {
          name: formData.name,
          durationMinutes: Number(formData.durationMinutes),
          price: Number(formData.price),
          isActive: formData.isActive
        });
        if (res.success) {
          if (onNotify) onNotify('Hizmet başarıyla güncellendi.', 'success');
          setIsModalOpen(false);
          fetchServices();
        }
      } else {
        const res = await servicesApi.create({
          name: formData.name,
          durationMinutes: Number(formData.durationMinutes),
          price: Number(formData.price)
        });
        if (res.success) {
          if (onNotify) onNotify('Yeni hizmet başarıyla eklendi.', 'success');
          setIsModalOpen(false);
          fetchServices();
        }
      }
    } catch (err) {
      setFormError(err.message || 'İşlem başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices = services
    .filter(s => {
      if (statusFilter === 'active') return s.isActive;
      if (statusFilter === 'inactive') return !s.isActive;
      return true;
    })
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scissors size={24} color="var(--primary-400)" />
            <span>Hizmet Yönetimi</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Salonda sunulan tüm bakım ve tıraş hizmetlerini yönetin.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Status Filter Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'all' ? 'var(--primary-gradient)' : 'transparent',
                color: statusFilter === 'all' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Tümü ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'active' ? 'var(--primary-gradient)' : 'transparent',
                color: statusFilter === 'active' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Aktif ({services.filter(s => s.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'inactive' ? 'var(--primary-gradient)' : 'transparent',
                color: statusFilter === 'inactive' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Pasif ({services.filter(s => !s.isActive).length})
            </button>
          </div>

          <div className="form-input-wrapper" style={{ width: '200px' }}>
            <Search size={16} className="form-input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Hizmet ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.55rem 1rem 0.55rem 2.5rem', fontSize: '0.875rem' }}
            />
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Yeni Hizmet Ekle</span>
          </button>
        </div>
      </div>

      {/* Services Table / Cards */}
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Hizmetler yükleniyor...
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Eşleşen hizmet bulunamadı.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hizmet Adı</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Süre</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiyat</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((srv) => (
                  <tr key={srv.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>#{srv.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#fff' }}>{srv.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        {srv.durationMinutes} dk
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#fbbf24', fontSize: '1rem' }}>
                      {srv.price} ₺
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {srv.isActive ? (
                        <span className="badge badge-customer">Aktif</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(srv)}
                          title="Tıklayarak aktif yap"
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <span>Pasif</span>
                          <span style={{ fontSize: '0.65rem', textDecoration: 'underline' }}>(Aktifleştir)</span>
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenEdit(srv)}
                          className="btn btn-secondary btn-sm"
                          title="Düzenle"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(srv.id, srv.name)}
                          className="btn btn-ghost btn-sm"
                          title={srv.isActive ? "Sil / Pasife Al" : "Kalıcı Olarak Sil"}
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
            maxWidth: '480px',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-medium)',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scissors size={20} color="var(--primary-400)" />
              <span>{editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</span>
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
                <label className="form-label">Hizmet Adı</label>
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Örn: Saç Kesimi & Yıkama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Süre (Dakika)</label>
                  <input
                    type="number"
                    className="form-input no-icon"
                    placeholder="30"
                    min={5}
                    max={300}
                    step={5}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fiyat (₺)</label>
                  <input
                    type="number"
                    className="form-input no-icon"
                    placeholder="250"
                    min={1}
                    step={1}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              {editingService && (
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 1.25rem' }}>
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-500)' }}
                  />
                  <label htmlFor="isActiveCheck" style={{ fontSize: '0.9rem', color: '#fff', cursor: 'pointer' }}>
                    Hizmet Aktif Olarak Sunulsun
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
                  {submitting ? 'Kaydediliyor...' : editingService ? 'Değişiklikleri Kaydet' : 'Hizmeti Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
