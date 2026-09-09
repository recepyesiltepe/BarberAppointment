import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { servicesApi, employeesApi } from '../api/barberApi';

export const AdminManagementScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeSection, setActiveSection] = useState('services'); // 'services' | 'employees'

  // Hizmetler State
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Personeller State
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  // Hizmet Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [srvName, setSrvName] = useState('');
  const [srvDuration, setSrvDuration] = useState('30');
  const [srvPrice, setSrvPrice] = useState('150');
  const [srvIsActive, setSrvIsActive] = useState(true);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // Personel Modal State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empTitle, setEmpTitle] = useState('Kuaför & Stilist');
  const [empIsActive, setEmpIsActive] = useState(true);
  const [empSelectedServiceIds, setEmpSelectedServiceIds] = useState([]);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await servicesApi.getAll(false);
      if (res.success) {
        setServices(res.data || []);
      }
    } catch (err) {
      Alert.alert('Hata', 'Hizmetler yüklenemedi: ' + err.message);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeesApi.getAll(false);
      if (res.success) {
        setEmployees(res.data || []);
      }
    } catch (err) {
      Alert.alert('Hata', 'Personeller yüklenemedi: ' + err.message);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadData = async () => {
    await Promise.all([fetchServices(), fetchEmployees()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // --- Hizmet İşlemleri ---
  const handleOpenAddService = () => {
    setEditingService(null);
    setSrvName('');
    setSrvDuration('30');
    setSrvPrice('150');
    setSrvIsActive(true);
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv) => {
    setEditingService(srv);
    setSrvName(srv.name || '');
    setSrvDuration(String(srv.durationMinutes || 30));
    setSrvPrice(String(srv.price || 0));
    setSrvIsActive(srv.isActive ?? true);
    setIsServiceModalOpen(true);
  };

  const handleToggleServiceStatus = async (srv) => {
    const newStatus = !srv.isActive;
    try {
      const res = await servicesApi.update(srv.id, {
        name: srv.name,
        durationMinutes: srv.durationMinutes,
        price: srv.price,
        isActive: newStatus
      });
      if (res.success) {
        Alert.alert('Başarılı', `"${srv.name}" hizmeti ${newStatus ? 'aktif' : 'pasif'} duruma getirildi.`);
        fetchServices();
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Durum güncellenemedi.');
    }
  };

  const handleDeleteService = (id, name) => {
    Alert.alert(
      'Hizmeti Sil',
      `"${name}" hizmetini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await servicesApi.delete(id);
              if (res.success) {
                Alert.alert('Başarılı', `"${name}" hizmeti silindi.`);
                fetchServices();
              }
            } catch (err) {
              Alert.alert('Hata', err.message || 'Silme işlemi başarısız.');
            }
          }
        }
      ]
    );
  };

  const handleSaveService = async () => {
    if (!srvName.trim()) {
      Alert.alert('Uyarı', 'Lütfen hizmet adını giriniz.');
      return;
    }
    const durationNum = parseInt(srvDuration, 10);
    const priceNum = parseFloat(srvPrice);

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir süre (dakika) giriniz.');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir fiyat giriniz.');
      return;
    }

    setServiceSubmitting(true);
    try {
      if (editingService) {
        const res = await servicesApi.update(editingService.id, {
          name: srvName.trim(),
          durationMinutes: durationNum,
          price: priceNum,
          isActive: srvIsActive
        });
        if (res.success) {
          Alert.alert('Başarılı', 'Hizmet başarıyla güncellendi.');
          setIsServiceModalOpen(false);
          fetchServices();
        }
      } else {
        const res = await servicesApi.create({
          name: srvName.trim(),
          durationMinutes: durationNum,
          price: priceNum,
          isActive: srvIsActive
        });
        if (res.success) {
          Alert.alert('Başarılı', 'Yeni hizmet başarıyla eklendi.');
          setIsServiceModalOpen(false);
          fetchServices();
        }
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'İşlem gerçekleştirilemedi.');
    } finally {
      setServiceSubmitting(false);
    }
  };

  // --- Personel İşlemleri ---
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpFullName('');
    setEmpTitle('Kuaför & Stilist');
    setEmpIsActive(true);
    setEmpSelectedServiceIds([]);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmpFullName(emp.fullName || '');
    setEmpTitle(emp.title || '');
    setEmpIsActive(emp.isActive ?? true);
    const assignedIds = emp.services ? emp.services.map((s) => s.id) : [];
    setEmpSelectedServiceIds(assignedIds);
    setIsEmployeeModalOpen(true);
  };

  const handleToggleEmpService = (serviceId) => {
    setEmpSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleDeleteEmployee = (id, name) => {
    Alert.alert(
      'Personeli Sil',
      `"${name}" personelini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await employeesApi.delete(id);
              if (res.success) {
                Alert.alert('Başarılı', `"${name}" personeli silindi.`);
                fetchEmployees();
              }
            } catch (err) {
              Alert.alert('Hata', err.message || 'Silme işlemi başarısız.');
            }
          }
        }
      ]
    );
  };

  const handleSaveEmployee = async () => {
    if (!empFullName.trim()) {
      Alert.alert('Uyarı', 'Lütfen personel adı ve soyadını giriniz.');
      return;
    }

    setEmployeeSubmitting(true);
    try {
      if (editingEmployee) {
        // 1. Bilgileri güncelle
        const res = await employeesApi.update(editingEmployee.id, {
          fullName: empFullName.trim(),
          title: empTitle.trim(),
          isActive: empIsActive
        });

        // 2. Hizmet atamalarını güncelle
        await employeesApi.assignServices(editingEmployee.id, empSelectedServiceIds).catch(() => {});

        if (res.success) {
          Alert.alert('Başarılı', 'Personel bilgileri güncellendi.');
          setIsEmployeeModalOpen(false);
          fetchEmployees();
        }
      } else {
        // Yeni personel oluştur
        const res = await employeesApi.create({
          fullName: empFullName.trim(),
          title: empTitle.trim(),
          isActive: empIsActive
        });

        if (res.success && res.data?.id) {
          if (empSelectedServiceIds.length > 0) {
            await employeesApi.assignServices(res.data.id, empSelectedServiceIds).catch(() => {});
          }
          Alert.alert('Başarılı', 'Yeni personel başarıyla kaydedildi.');
          setIsEmployeeModalOpen(false);
          fetchEmployees();
        }
      }
    } catch (err) {
      Alert.alert('Hata', err.message || 'Personel işlemi başarısız.');
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  // Filtrelemeler
  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name?.toLowerCase().includes(serviceSearch.toLowerCase());
    if (serviceFilter === 'active') return matchesSearch && s.isActive;
    if (serviceFilter === 'inactive') return matchesSearch && !s.isActive;
    return matchesSearch;
  });

  const filteredEmployees = employees.filter((e) =>
    e.fullName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.title && e.title.toLowerCase().includes(employeeSearch.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      {/* Top Segmented Control */}
      <View style={styles.segmentedWrapper}>
        <TouchableOpacity
          style={[styles.segmentButton, activeSection === 'services' && styles.segmentButtonActive]}
          onPress={() => setActiveSection('services')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeSection === 'services' && styles.segmentTextActive]}>
            ✂️ Hizmetler ({services.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, activeSection === 'employees' && styles.segmentButtonActive]}
          onPress={() => setActiveSection('employees')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeSection === 'employees' && styles.segmentTextActive]}>
            👥 Personeller ({employees.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ========================================================================= */}
        {/* HİZMETLER PANELİ */}
        {/* ========================================================================= */}
        {activeSection === 'services' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Hizmet Kataloğu</Text>
                <Text style={styles.sectionSub}>Salon hizmetlerini ekleyin, düzenleyin ve yönetin</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleOpenAddService}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>+ Yeni Hizmet</Text>
              </TouchableOpacity>
            </View>

            {/* Arama ve Filtre */}
            <TextInput
              style={styles.searchInput}
              placeholder="Hizmet ara..."
              placeholderTextColor={colors.textMuted}
              value={serviceSearch}
              onChangeText={setServiceSearch}
            />

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, serviceFilter === 'all' && styles.filterChipActive]}
                onPress={() => setServiceFilter('all')}
              >
                <Text style={[styles.filterChipText, serviceFilter === 'all' && styles.filterChipTextActive]}>
                  Tümü ({services.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, serviceFilter === 'active' && styles.filterChipActive]}
                onPress={() => setServiceFilter('active')}
              >
                <Text style={[styles.filterChipText, serviceFilter === 'active' && styles.filterChipTextActive]}>
                  Aktif ({services.filter((s) => s.isActive).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, serviceFilter === 'inactive' && styles.filterChipActive]}
                onPress={() => setServiceFilter('inactive')}
              >
                <Text style={[styles.filterChipText, serviceFilter === 'inactive' && styles.filterChipTextActive]}>
                  Pasif ({services.filter((s) => !s.isActive).length})
                </Text>
              </TouchableOpacity>
            </View>

            {loadingServices ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
            ) : filteredServices.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Hizmet bulunamadı.</Text>
              </View>
            ) : (
              filteredServices.map((srv) => (
                <View key={srv.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.itemTitle}>{srv.name}</Text>
                        <View style={[styles.statusBadge, srv.isActive ? styles.badgeActive : styles.badgeInactive]}>
                          <Text style={[styles.statusBadgeText, { color: srv.isActive ? '#10b981' : '#f87171' }]}>
                            {srv.isActive ? 'Aktif' : 'Pasif'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.itemSubtitle}>
                        ⏱ {srv.durationMinutes} dk işlem süresi • 🏷 {srv.price} ₺
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemCardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                      onPress={() => handleToggleServiceStatus(srv)}
                    >
                      <Text style={[styles.actionBtnText, { color: srv.isActive ? '#f87171' : '#10b981' }]}>
                        {srv.isActive ? 'Pasife Al' : 'Aktif Et'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                      onPress={() => handleOpenEditService(srv)}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>✏️ Düzenle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                      onPress={() => handleDeleteService(srv.id, srv.name)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#f87171' }]}>🗑 Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* PERSONELLER PANELİ */}
        {/* ========================================================================= */}
        {activeSection === 'employees' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Ekip Kadrosu</Text>
                <Text style={styles.sectionSub}>Kuaförleri ekleyin, düzenleyin ve hizmet atayın</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleOpenAddEmployee}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>+ Yeni Personel</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Personel veya unvan ara..."
              placeholderTextColor={colors.textMuted}
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
            />

            {loadingEmployees ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
            ) : filteredEmployees.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Personel bulunamadı.</Text>
              </View>
            ) : (
              filteredEmployees.map((emp) => {
                const assignedServices = emp.services || [];
                return (
                  <View key={emp.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <View style={styles.empAvatar}>
                        <Text style={styles.empAvatarText}>{emp.fullName?.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.itemTitle}>{emp.fullName}</Text>
                          <View style={[styles.statusBadge, emp.isActive ? styles.badgeActive : styles.badgeInactive]}>
                            <Text style={[styles.statusBadgeText, { color: emp.isActive ? '#10b981' : '#f87171' }]}>
                              {emp.isActive ? 'Aktif' : 'Pasif'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.itemSubtitle, { color: colors.info }]}>
                          {emp.title || 'Usta Kuaför'}
                        </Text>
                      </View>
                    </View>

                    {/* Atanmış Hizmet Etiketleri */}
                    <View style={{ marginVertical: 10 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '600' }}>
                        Verebildiği Hizmetler ({assignedServices.length}):
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {assignedServices.length === 0 ? (
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                            Henüz atanmış özel hizmet yok (Tüm hizmetleri verebilir)
                          </Text>
                        ) : (
                          assignedServices.map((s) => (
                            <View key={s.id} style={styles.serviceChip}>
                              <Text style={styles.serviceChipText}>✂️ {s.name}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    </View>

                    <View style={styles.itemCardActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={() => handleOpenEditEmployee(emp)}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>✏️ Düzenle / Hizmet Ata</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                        onPress={() => handleDeleteEmployee(emp.id, emp.fullName)}
                      >
                        <Text style={[styles.actionBtnText, { color: '#f87171' }]}>🗑 Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* HİZMET EKLE / DÜZENLE MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isServiceModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsServiceModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
              </Text>
              <TouchableOpacity onPress={() => setIsServiceModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Hizmet Adı *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Örn: Saç & Sakal Tasarımı"
                placeholderTextColor={colors.textMuted}
                value={srvName}
                onChangeText={setSrvName}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Süre (Dakika) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="30"
                    placeholderTextColor={colors.textMuted}
                    value={srvDuration}
                    onChangeText={setSrvDuration}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Fiyat (₺) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="150"
                    placeholderTextColor={colors.textMuted}
                    value={srvPrice}
                    onChangeText={setSrvPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>Aktiflik Durumu</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Randevu listesinde müşterilere görünsün</Text>
                </View>
                <Switch
                  value={srvIsActive}
                  onValueChange={setSrvIsActive}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsServiceModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, serviceSubmitting && { opacity: 0.7 }]}
                  onPress={handleSaveService}
                  disabled={serviceSubmitting}
                >
                  {serviceSubmitting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingService ? 'Kaydet' : 'Hizmeti Ekle'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* PERSONEL EKLE / DÜZENLE MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isEmployeeModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEmployeeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEmployee ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}
              </Text>
              <TouchableOpacity onPress={() => setIsEmployeeModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Ad Soyad *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Örn: Ahmet Usta"
                placeholderTextColor={colors.textMuted}
                value={empFullName}
                onChangeText={setEmpFullName}
              />

              <Text style={styles.inputLabel}>Unvan / Uzmanlık *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Örn: Baş Kuaför & Sakal Uzmanı"
                placeholderTextColor={colors.textMuted}
                value={empTitle}
                onChangeText={setEmpTitle}
              />

              <View style={styles.switchRow}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>Aktiflik Durumu</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Randevu almaya uygun personel</Text>
                </View>
                <Switch
                  value={empIsActive}
                  onValueChange={setEmpIsActive}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Hizmet Atama Çoklu Seçim */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Verebileceği Hizmetler</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
                  Personelin yapabildiği hizmetleri seçin:
                </Text>

                <View style={{ gap: 8 }}>
                  {services.map((srv) => {
                    const isSelected = empSelectedServiceIds.includes(srv.id);
                    return (
                      <TouchableOpacity
                        key={srv.id}
                        style={[
                          styles.serviceSelectOption,
                          isSelected && styles.serviceSelectOptionActive
                        ]}
                        onPress={() => handleToggleEmpService(srv.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.serviceOptionText, isSelected && { color: colors.primary }]}>
                          {isSelected ? '☑ ' : '☐ '} {srv.name} ({srv.price} ₺)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEmployeeModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, employeeSubmitting && { opacity: 0.7 }]}
                  onPress={handleSaveEmployee}
                  disabled={employeeSubmitting}
                >
                  {employeeSubmitting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingEmployee ? 'Kaydet' : 'Personeli Ekle'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgMain
    },
    segmentedWrapper: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      padding: 6,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10
    },
    segmentButtonActive: {
      backgroundColor: colors.primary
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary
    },
    segmentTextActive: {
      color: '#000000'
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary
    },
    sectionSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10
    },
    addButtonText: {
      color: '#000',
      fontSize: 12,
      fontWeight: '800'
    },
    searchInput: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 12
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(245, 158, 11, 0.15)'
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary
    },
    filterChipTextActive: {
      color: colors.primary
    },
    emptyCard: {
      padding: 30,
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13
    },
    itemCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    itemCardHeader: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary
    },
    itemSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1
    },
    badgeActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    badgeInactive: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700'
    },
    itemCardActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '700'
    },
    empAvatar: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#0284c7',
      alignItems: 'center',
      justifyContent: 'center'
    },
    empAvatarText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800'
    },
    serviceChip: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6
    },
    serviceChipText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600'
    },
    // Modal Stilleri
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end'
    },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '90%'
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary
    },
    modalCloseBtn: {
      padding: 4
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
      marginTop: 10
    },
    modalInput: {
      backgroundColor: colors.bgMain,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 6
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border
    },
    serviceSelectOption: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgMain
    },
    serviceSelectOptionActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(245, 158, 11, 0.1)'
    },
    serviceOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    cancelBtnText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '700'
    },
    saveBtn: {
      flex: 2,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.primary
    },
    saveBtnText: {
      fontSize: 13,
      color: '#000',
      fontWeight: '800'
    }
  });

