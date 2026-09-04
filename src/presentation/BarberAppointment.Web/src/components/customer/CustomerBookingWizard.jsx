import React, { useState, useEffect } from 'react';
import {
  Scissors,
  User,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Search
} from 'lucide-react';
import { servicesApi, employeesApi, appointmentsApi } from '../../api/barberApi';
import { useAuth } from '../../context/AuthContext';

export const CustomerBookingWizard = ({ onBookingComplete, onNotify }) => {
  const { user } = useAuth();

  // Wizard Step: 1 = Service, 2 = Employee, 3 = Date & Slot, 4 = Review, 5 = Success
  const [currentStep, setCurrentStep] = useState(1);

  // Data States
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');

  // Booking Selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');

  // Result
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // Generate next 7 days
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : d.toLocaleDateString('tr-TR', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('tr-TR', { month: 'short' });
      dates.push({ iso, dayName, dayNum, monthName });
    }
    return dates;
  };

  const datesList = getNext7Days();

  // Load Services on mount
  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const res = await servicesApi.getAll(true);
        if (res.success) {
          setServices(res.data || []);
        }
      } catch (err) {
        setError('Hizmetler yüklenemedi: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  // When a service is selected, load compatible employees
  const handleSelectService = async (service) => {
    setSelectedService(service);
    setSelectedEmployee(null);
    setSelectedSlot(null);
    setError(null);
    setLoading(true);

    try {
      const res = await employeesApi.getByService(service.id).catch(() => employeesApi.getAll(true));
      if (res.success && res.data && res.data.length > 0) {
        setEmployees(res.data);
      } else {
        const fallback = await employeesApi.getAll(true);
        setEmployees(fallback.data || []);
      }
      setCurrentStep(2);
    } catch (err) {
      setError('Personeller getirilemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // When an employee is selected, initialize date and fetch slots
  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setSelectedSlot(null);
    setError(null);
    const initialDate = datesList[0].iso;
    setSelectedDate(initialDate);
    fetchSlots(employee.id, selectedService.id, initialDate);
    setCurrentStep(3);
  };

  // Fetch available slots from backend
  const fetchSlots = async (employeeId, serviceId, date) => {
    setLoadingSlots(true);
    setError(null);
    try {
      const res = await appointmentsApi.getAvailableSlots(employeeId, serviceId, date);
      if (res.success) {
        setAvailableSlots(res.data || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      setError('Müsait saatler alınırken hata oluştu: ' + err.message);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (dateIso) => {
    setSelectedDate(dateIso);
    setSelectedSlot(null);
    if (selectedEmployee && selectedService) {
      fetchSlots(selectedEmployee.id, selectedService.id, dateIso);
    }
  };

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedService || !selectedEmployee) {
      setError('Lütfen tüm seçimleri tamamlayınız.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appointmentPayload = {
        userId: user?.id || 1,
        employeeId: selectedEmployee.id,
        serviceId: selectedService.id,
        startAt: selectedSlot.startAt,
        notes: notes || null
      };

      const res = await appointmentsApi.create(appointmentPayload);
      if (res.success && res.data) {
        setCreatedAppointment(res.data);
        setCurrentStep(5);
        if (onNotify) onNotify('Randevunuz başarıyla oluşturuldu!', 'success');
      } else {
        throw new Error(res.message || 'Randevu oluşturulamadı.');
      }
    } catch (err) {
      setError(err.message || 'Randevu oluşturulurken bir hata oluştu.');
      if (onNotify) onNotify(err.message || 'Randevu oluşturulamadı.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHuman = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Wizard Step Navigation */}
      {currentStep < 5 && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: currentStep >= 1 ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.08)',
                color: currentStep >= 1 ? '#000' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>1</div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: currentStep === 1 ? 'var(--primary-400)' : 'var(--text-secondary)' }}>Hizmet</span>
            </div>

            <div style={{ flex: 1, height: '2px', background: currentStep >= 2 ? 'var(--primary-400)' : 'var(--border-subtle)', margin: '0 0.5rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: currentStep >= 2 ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.08)',
                color: currentStep >= 2 ? '#000' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>2</div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: currentStep === 2 ? 'var(--primary-400)' : 'var(--text-secondary)' }}>Kuaför</span>
            </div>

            <div style={{ flex: 1, height: '2px', background: currentStep >= 3 ? 'var(--primary-400)' : 'var(--border-subtle)', margin: '0 0.5rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: currentStep >= 3 ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.08)',
                color: currentStep >= 3 ? '#000' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>3</div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: currentStep === 3 ? 'var(--primary-400)' : 'var(--text-secondary)' }}>Tarih & Saat</span>
            </div>

            <div style={{ flex: 1, height: '2px', background: currentStep >= 4 ? 'var(--primary-400)' : 'var(--border-subtle)', margin: '0 0.5rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: currentStep >= 4 ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.08)',
                color: currentStep >= 4 ? '#000' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>4</div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: currentStep === 4 ? 'var(--primary-400)' : 'var(--text-secondary)' }}>Onay</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Box */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#fca5a5',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── STEP 1: HİZMET SEÇİMİ ────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scissors size={24} color="var(--primary-400)" />
                <span>1. Adım: Hizmetinizi Seçin</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Almak istediğiniz bakım veya saç tasarım hizmetini belirleyin.
              </p>
            </div>

            <div className="form-input-wrapper" style={{ width: '240px' }}>
              <Search size={16} className="form-input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Hizmet ara..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                style={{ padding: '0.45rem 1rem 0.45rem 2.2rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Hizmetler yükleniyor...</div>
          ) : filteredServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Uygun hizmet bulunamadı.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => handleSelectService(srv)}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: selectedService?.id === srv.id ? '2px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-400)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedService?.id === srv.id ? 'var(--primary-400)' : 'var(--border-subtle)'}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{srv.name}</h4>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{srv.price} ₺</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <Clock size={14} /> {srv.durationMinutes} dakika işlem süresi
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                      <span>Seç ve İlerle</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: PERSONEL SEÇİMİ ──────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>
              ✂️ Seçilen Hizmet: <strong style={{ color: '#fff' }}>{selectedService?.name}</strong> ({selectedService?.price} ₺ • {selectedService?.durationMinutes} dk)
            </div>
            <button onClick={() => setCurrentStep(1)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
              Değiştir
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={24} color="#38bdf8" />
              <span>2. Adım: Kuaförünüzü Seçin</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              İşleminizi gerçekleştirecek uzman berber / kuaför personelini seçin.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Personeller yükleniyor...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: selectedEmployee?.id === emp.id ? '2px solid #38bdf8' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedEmployee?.id === emp.id ? '#38bdf8' : 'var(--border-subtle)'}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700
                  }}>
                    {emp.fullName?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>{emp.fullName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '2px' }}>{emp.title || 'Usta Kuaför'}</div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={() => setCurrentStep(1)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ChevronLeft size={16} />
              <span>Geri (Hizmet Seçimi)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: TARİH VE SAAT SEÇİMİ ─────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>
              ✂️ {selectedService?.name} • 👤 {selectedEmployee?.fullName}
            </div>
            <button onClick={() => setCurrentStep(2)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
              Değiştir
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={24} color="#10b981" />
              <span>3. Adım: Tarih ve Müsait Saat Seçin</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Size uygun günü ve personelin boş randevu saatini belirleyin.
            </p>
          </div>

          {/* Date Chips Row */}
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            {datesList.map((d) => {
              const isSelected = selectedDate === d.iso;
              return (
                <div
                  key={d.iso}
                  onClick={() => handleDateChange(d.iso)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--primary-gradient)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                    color: isSelected ? '#000' : '#fff',
                    textAlign: 'center',
                    cursor: 'pointer',
                    minWidth: '85px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: isSelected ? 0.9 : 0.6 }}>{d.dayName}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0' }}>{d.dayNum}</div>
                  <div style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.6 }}>{d.monthName}</div>
                </div>
              );
            })}
          </div>

          {/* Time Slots Grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Müsait Randevu Saatleri ({availableSlots.length} Boş Saat)</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateHuman(selectedDate)}</span>
            </div>

            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Boş slotlar taranıyor...</div>
            ) : availableSlots.length === 0 ? (
              <div style={{
                padding: '1.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                textAlign: 'center',
                fontSize: '0.9rem'
              }}>
                ⚠️ Seçilen tarihte personelin uygun boş randevu saati kalmamıştır. Lütfen farklı bir gün veya kuaför seçiniz.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
                {availableSlots.map((slot, idx) => {
                  const isSelected = selectedSlot?.startAt === slot.startAt;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setCurrentStep(4);
                      }}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--primary-gradient)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                        color: isSelected ? '#000' : '#fff',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--primary-400)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }}
                    >
                      {formatTime(slot.startAt)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={() => setCurrentStep(2)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ChevronLeft size={16} />
              <span>Geri (Personel Seçimi)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: ÖZET VE ONAY ─────────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} color="#fbbf24" />
              <span>4. Adım: Randevu Özeti & Onay</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Lütfen randevu detaylarınızı kontrol edip randevunuzu kesinleştirin.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hizmet</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{selectedService?.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedService?.durationMinutes} Dakika İşlem</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uzman Kuaför</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>{selectedEmployee?.fullName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedEmployee?.title || 'Usta Kuaför'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Randevu Zamanı</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{formatDateHuman(selectedDate)}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
                  {formatTime(selectedSlot?.startAt)} – {formatTime(selectedSlot?.endAt)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ödenecek Tutar</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                  {selectedService?.price} ₺
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Salonda ödeme</div>
              </div>
            </div>
          </div>

          {/* Notes Input */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Randevu Notu (İsteğe Bağlı)</label>
            <input
              type="text"
              className="form-input no-icon"
              placeholder="Örn: Özel saç sakal modeli veya yıkama tercihi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button onClick={() => setCurrentStep(3)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ChevronLeft size={16} />
              <span>Geri (Saat Değiştir)</span>
            </button>

            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', fontWeight: 700 }}
            >
              {loading ? 'Randevu Kaydediliyor...' : '🎉 Randevuyu Kesinleştir ve Onayla'}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: BAŞARI EKRANI ────────────────────────────────────────── */}
      {currentStep === 5 && (
        <div className="glass-card" style={{
          padding: '3rem 2rem',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '2px solid var(--primary-400)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2.5rem'
          }}>
            🎉
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#fff' }}>Randevunuz Başarıyla Oluşturuldu!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '540px', margin: '0 auto 2rem' }}>
            Rezervasyonunuz onaylandı. Kuaför salonumuzda sizi ağırlamaktan mutluluk duyacağız.
          </p>

          <div style={{
            background: '#0a0d14',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            maxWidth: '480px',
            margin: '0 auto 2rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Randevu No:</span>
              <span style={{ fontWeight: 800, color: 'var(--primary-400)' }}>#{createdAppointment?.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hizmet:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{createdAppointment?.serviceName} ({createdAppointment?.durationMinutes} dk)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Kuaför:</span>
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>{createdAppointment?.employeeName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Zaman:</span>
              <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                {new Date(createdAppointment?.startAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} {formatTime(createdAppointment?.startAt)} – {formatTime(createdAppointment?.endAt)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tutar:</span>
              <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1.2rem' }}>{createdAppointment?.price} ₺</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (onBookingComplete) onBookingComplete();
              }}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
            >
              <Calendar size={18} />
              <span>Randevularımı Görüntüle</span>
            </button>

            <button
              onClick={() => {
                setCurrentStep(1);
                setSelectedService(null);
                setSelectedEmployee(null);
                setSelectedSlot(null);
                setCreatedAppointment(null);
                setNotes('');
              }}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              <span>+ Yeni Randevu Al</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

