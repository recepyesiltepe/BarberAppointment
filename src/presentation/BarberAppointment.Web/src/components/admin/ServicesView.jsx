import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Edit2, Trash2, Search, Clock, Check, X, AlertCircle, Sparkles, Package, Layers, Info } from 'lucide-react';
import { servicesApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';

export const ServicesView = ({ onNotify }) => {
  const { user, roleName } = useAuth();
  const isAdmin = roleName === 'Admin' || user?.role === 2;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'composite'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null); // null = add, object = edit
  const [formData, setFormData] = useState({
    name: '',
    durationMinutes: 30,
    price: 150,
    isActive: true,
    isComposite: false,
    subServiceIds: []
  });
  const [suggestedAutoName, setSuggestedAutoName] = useState('');
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
    setFormData({
      name: '',
      durationMinutes: 30,
      price: 150,
      isActive: true,
      isComposite: false,
      subServiceIds: []
    });
    setSuggestedAutoName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv) => {
    setEditingService(srv);
    const subIds = srv.subServices ? srv.subServices.map(s => s.id) : [];
    setFormData({
      name: srv.name,
      durationMinutes: srv.durationMinutes,
      price: srv.price,
      isActive: srv.isActive,
      isComposite: !!srv.isComposite,
      subServiceIds: subIds
    });
    setSuggestedAutoName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Kompozit alt hizmet seçimi / kaldırma
  const handleToggleSubService = (subId) => {
    const exists = formData.subServiceIds.includes(subId);
    const nextIds = exists
      ? formData.subServiceIds.filter(id => id !== subId)
      : [...formData.subServiceIds, subId];

    // Mevcut standart hizmetler arasından seçilenleri bul
    const selectedSubs = services.filter(s => nextIds.includes(s.id));
    const autoDuration = selectedSubs.reduce((acc, s) => acc + s.durationMinutes, 0);
    const autoPrice = selectedSubs.reduce((acc, s) => acc + s.price, 0);
    const newSuggestedName = selectedSubs.map(s => s.name).join(' + ');

    setFormData(prev => {
      const shouldUpdateName = !prev.name || prev.name === suggestedAutoName;
      return {
        ...prev,
        subServiceIds: nextIds,
        durationMinutes: autoDuration > 0 ? autoDuration : prev.durationMinutes,
        price: autoPrice > 0 ? autoPrice : prev.price,
        name: shouldUpdateName && newSuggestedName ? newSuggestedName : prev.name
      };
    });
    setSuggestedAutoName(newSuggestedName);
  };

  const handleToggleStatus = async (srv) => {
    try {
      const newStatus = !srv.isActive;
      const res = await servicesApi.update(srv.id, {
        name: srv.name,
        durationMinutes: srv.durationMinutes,
        price: srv.price,
        isActive: newStatus,
        isComposite: srv.isComposite,
        subServiceIds: srv.subServices ? srv.subServices.map(s => s.id) : []
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

    if (formData.isComposite) {
      if (!formData.subServiceIds || formData.subServiceIds.length < 2) {
        setFormError('Kompozit paket oluşturmak için en az 2 farklı alt hizmet seçmelisiniz.');
        return;
      }
    }

    if (formData.durationMinutes < 5 || formData.durationMinutes > 480) {
      setFormError('Süre 5 ile 480 dakika arasında olmalıdır.');
      return;
    }
    if (formData.price <= 0) {
      setFormError('Fiyat 0\'dan büyük olmalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingService) {
        const res = await servicesApi.update(editingService.id, {
          name: formData.name.trim(),
          durationMinutes: Number(formData.durationMinutes),
          price: Number(formData.price),
          isActive: formData.isActive,
          isComposite: formData.isComposite,
          subServiceIds: formData.isComposite ? formData.subServiceIds : null
        });
        if (res.success) {
          if (onNotify) onNotify('Hizmet başarıyla güncellendi.', 'success');
          setIsModalOpen(false);
          fetchServices();
        }
      } else {
        const res = await servicesApi.create({
          name: formData.name.trim(),
          durationMinutes: Number(formData.durationMinutes),
          price: Number(formData.price),
          isComposite: formData.isComposite,
          subServiceIds: formData.isComposite ? formData.subServiceIds : null
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

  // Kompozit hizmete dahil edilebilecek standart (tekil) hizmetler
  const availableStandardServices = services.filter(s => 
    !s.isComposite && s.isActive && (editingService ? s.id !== editingService.id : true)
  );

  const filteredServices = services
    .filter(s => {
      if (statusFilter === 'active') return s.isActive;
      if (statusFilter === 'inactive') return !s.isActive;
      if (statusFilter === 'composite') return s.isComposite;
      return true;
    })
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  // Kompozit formunda seçili alt hizmetlerin standart toplam tutarı
  const selectedSubServicesObjects = services.filter(s => formData.subServiceIds.includes(s.id));
  const standardTotalSum = selectedSubServicesObjects.reduce((acc, s) => acc + s.price, 0);

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
            Salonda sunulan tekil ve kompozit (paket) hizmetleri yönetin.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Status Filter Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--tab-nav-bg)',
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
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Aktif ({services.filter(s => s.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('composite')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === 'composite' ? 'var(--primary-gradient)' : 'transparent',
                color: statusFilter === 'composite' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📦 Paketler ({services.filter(s => s.isComposite).length})
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
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Pasif ({services.filter(s => !s.isActive).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="search-box" style={{ width: '220px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Hizmet ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="btn-ghost"
                style={{ position: 'absolute', right: '8px', padding: '2px', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-glow)' }}
            >
              <Plus size={16} />
              <span>Yeni Hizmet Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Services Table */}
      <div className="table-responsive glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner-sm" style={{ width: '24px', height: '24px', margin: '0 auto 0.75rem', borderColor: 'var(--primary-400)', borderTopColor: 'transparent' }} />
            <div>Hizmetler yükleniyor...</div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Scissors size={28} />
            </div>
            <div className="empty-state-title">Hizmet Bulunamadı</div>
            <div className="empty-state-desc">
              Aradığınız kriterlere uygun hizmet bulunamadı. Yeni bir hizmet ekleyebilir veya filtreleri temizleyebilirsiniz.
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr style={{ background: 'var(--btn-secondary-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hizmet Adı & İçerik</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tür</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Süre</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiyat</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Durum</th>
                {isAdmin && <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>İşlemler</th>}
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((srv) => (
                <tr key={srv.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{srv.name}</span>
                      {srv.isComposite && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          <Package size={12} /> Kompozit Paket
                        </span>
                      )}
                    </div>

                    {/* Kompozit Alt Hizmetler Detayı */}
                    {srv.isComposite && srv.subServices && srv.subServices.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                        {srv.subServices.map(sub => (
                          <span
                            key={sub.id}
                            style={{
                              background: 'var(--card-nested-bg)',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <span>✂️ {sub.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>({sub.durationMinutes} dk)</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {srv.isComposite ? (
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>Paket</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Tekil</span>
                    )}
                  </td>

                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} color="var(--text-muted)" />
                      {srv.durationMinutes} dk
                    </span>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1rem' }}>
                        {srv.price} ₺
                      </span>
                      {srv.isComposite && srv.subServices && srv.subServices.length > 0 && (() => {
                        const totalList = srv.subServices.reduce((acc, sub) => acc + sub.price, 0);
                        if (totalList > srv.price) {
                          return (
                            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }} title={`Tek tek alımda toplam ${totalList} ₺`}>
                              ({totalList - srv.price} ₺ İndirimli)
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    {srv.isActive ? (
                      <span className="badge badge-customer">Aktif</span>
                    ) : isAdmin ? (
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
                    ) : (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>Pasif</span>
                    )}
                  </td>

                  {isAdmin && (
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
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                {formData.isComposite ? <Package size={20} color="#38bdf8" /> : <Scissors size={20} color="var(--primary-400)" />}
                <span>{editingService ? (formData.isComposite ? 'Kompozit Paketi Düzenle' : 'Hizmeti Düzenle') : (formData.isComposite ? 'Yeni Kompozit Paket Ekle' : 'Yeni Hizmet Ekle')}</span>
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
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {formError && (
                  <div className="alert-card alert-card-error">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>{formError}</div>
                  </div>
                )}

                {/* Hizmet Türü Seçimi (Standart vs Kompozit) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Hizmet Türü</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    background: 'var(--bg-card-solid)',
                    padding: '4px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isComposite: false }))}
                      style={{
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: !formData.isComposite ? 'var(--primary-gradient)' : 'transparent',
                        color: !formData.isComposite ? '#000' : 'var(--text-secondary)',
                        fontWeight: !formData.isComposite ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Scissors size={15} />
                      <span>Standart Hizmet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isComposite: true }))}
                      style={{
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: formData.isComposite ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                        color: formData.isComposite ? '#fff' : 'var(--text-secondary)',
                        fontWeight: formData.isComposite ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Package size={15} />
                      <span>Kompozit (Paket) Hizmet</span>
                    </button>
                  </div>
                </div>

                {/* Kompozit Seçimi Aktifken: Alt Hizmet Listesi */}
                {formData.isComposite && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Layers size={15} /> Pakete Dahil Edilecek Alt Hizmetler (En az 2 adet)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: formData.subServiceIds.length >= 2 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                        {formData.subServiceIds.length} seçildi
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Alt hizmetleri seçtiğinizde toplam süre ve fiyat otomatik toplanır. Dilerseniz aşağıdan paket fiyatını indirimli olarak belirleyebilirsiniz.
                    </p>

                    {availableStandardServices.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#f87171', padding: '0.5rem', textAlign: 'center' }}>
                        Paket oluşturmak için önce en az 2 standart hizmet eklemelisiniz.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {availableStandardServices.map(sub => {
                          const isSelected = formData.subServiceIds.includes(sub.id);
                          return (
                            <div
                              key={sub.id}
                              onClick={() => handleToggleSubService(sub.id)}
                              style={{
                                padding: '0.6rem 0.75rem',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-input)',
                                border: isSelected ? '1.5px solid #38bdf8' : '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '4px',
                                  border: isSelected ? 'none' : '1px solid var(--border-medium)',
                                  backgroundColor: isSelected ? '#38bdf8' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isSelected && <Check size={12} color="#000" strokeWidth={3} />}
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {sub.name}
                                </span>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24' }}>{sub.price} ₺</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub.durationMinutes} dk</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {formData.subServiceIds.length > 0 && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(56, 189, 248, 0.08)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <span>Alt Hizmetler Toplamı:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {standardTotalSum} ₺ • {formData.durationMinutes} dakika
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Hizmet Adı</label>
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder={formData.isComposite ? "Örn: Saç Kesimi + Sakal Tıraşı Paketi" : "Örn: Saç Kesimi & Yıkama"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Süre (Dakika)</span>
                      {formData.isComposite && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>(Otomatik toplanır)</span>}
                    </label>
                    <input
                      type="number"
                      className="form-input no-icon"
                      placeholder="30"
                      min={5}
                      max={480}
                      step={5}
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>{formData.isComposite ? 'Paket Fiyatı (₺)' : 'Fiyat (₺)'}</span>
                      {formData.isComposite && <span style={{ fontSize: '0.7rem', color: '#38bdf8', marginLeft: '0.35rem' }}>(İndirimli girilebilir)</span>}
                    </label>
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
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 1rem' }}>
                    <input
                      type="checkbox"
                      id="isActiveCheck"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-500)' }}
                    />
                    <label htmlFor="isActiveCheck" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Hizmet Aktif Olarak Sunulsun
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: formData.isComposite ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : undefined
                  }}
                >
                  {submitting ? (
                    <>
                      <div className="spinner-sm" style={{ width: '14px', height: '14px', borderColor: '#000', borderTopColor: 'transparent' }} />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{editingService ? 'Değişiklikleri Kaydet' : (formData.isComposite ? 'Paketi Oluştur' : 'Hizmeti Ekle')}</span>
                    </>
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
