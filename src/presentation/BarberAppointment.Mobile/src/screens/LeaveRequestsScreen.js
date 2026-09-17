import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { leaveApi, employeesApi } from '../api/barberApi';

export const LeaveRequestsScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, roleName } = useAuth();
  const isAdmin = roleName === 'Admin';
  const isEmployee = roleName === 'Employee';

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | '0' | '1' | '2' | '3'
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leaveMode, setLeaveMode] = useState('fullday'); // 'fullday' | 'hourly' | 'range'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('19:00');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Review Modal (Admin)
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approve' | 'reject' }
  const [adminNote, setAdminNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Cancel Modal
  const [cancelModal, setCancelModal] = useState(null); // leave object
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Mevcut giriş yapmış personeli bul
  const currentEmployee = employees.find(e =>
    (user?.employeeId && e.id === user.employeeId) ||
    e.userId === user?.id ||
    (user?.fullName && e.fullName?.toLowerCase() === user.fullName?.toLowerCase())
  );

  const fetchData = async () => {
    try {
      const empRes = await employeesApi.getAll(false).catch(() => ({ success: false, data: [] }));
      if (empRes.success) setEmployees(empRes.data || []);

      let res;
      if (isAdmin) {
        res = await leaveApi.getAll();
      } else {
        res = await leaveApi.getMyLeaves();
      }

      if (res.success) {
        setLeaves(res.data || []);
      }
    } catch (err) {
      console.log('İzin verileri yüklenirken hata:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Yeni izin modalını aç
  const handleOpenCreateModal = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setStartDate(todayStr);
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

    setIsCreateModalOpen(true);
  };

  // Yeni talep oluştur
  const handleCreateSubmit = async () => {
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

    if (!startDate) {
      setFormError('Lütfen başlangıç tarihini seçiniz.');
      return;
    }

    let finalStart;
    let finalEnd;

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
        Alert.alert('Başarılı 🎉', isAdmin ? 'Personel izni tanımlandı ve onaylandı.' : 'İzin talebiniz iletildi.');
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        setFormError(res.message || 'İzin oluşturulamadı.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'İşlem başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Onayla / Reddet
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
        Alert.alert(
          'İşlem Tamamlandı',
          reviewModal.action === 'approve'
            ? 'İzin onaylandı. Personelin takvimi randevu alımına kapatıldı.'
            : 'İzin talebi reddedildi.'
        );
        setReviewModal(null);
        setAdminNote('');
        fetchData();
      } else {
        Alert.alert('Hata', res.message || 'İşlem başarısız.');
      }
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || err.message || 'Hata oluştu.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // İptal Et
  const handleCancelSubmit = async () => {
    if (!cancelModal) return;
    setCancelSubmitting(true);
    try {
      const res = await leaveApi.cancel(cancelModal.id, cancelReason);
      if (res.success) {
        const msg = cancelModal.status === 1
          ? 'Onaylı izin iptal edildi. Personelin randevu slotları müşterilere tekrar açıldı.'
          : 'İzin talebi başarıyla iptal edildi.';
        Alert.alert('İptal Edildi', msg);
        setCancelModal(null);
        setCancelReason('');
        fetchData();
      } else {
        Alert.alert('Hata', res.message || 'İptal işlemi başarısız.');
      }
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || err.message || 'Hata oluştu.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // KPI Hesaplamaları
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
      if (statusFilter !== 'all' && item.status.toString() !== statusFilter) {
        return false;
      }
      if (employeeFilter && item.employeeId.toString() !== employeeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const empMatch = item.employeeName?.toLowerCase().includes(query);
        const reasonMatch = item.reason?.toLowerCase().includes(query);
        if (!empMatch && !reasonMatch) return false;
      }
      return true;
    });
  }, [leaves, statusFilter, employeeFilter, searchQuery]);

  // Tarih ve süre formatı
  const formatDateText = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDuration = (startStr, endStr) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffMs = e - s;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const isSameDay = s.toDateString() === e.toDateString();

    if (isSameDay && (diffHours >= 23 && diffHours <= 24 || (s.getHours() === 0 && e.getHours() === 23))) {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
        return { label: '✓ Onaylandı', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 2:
        return { label: '✗ Reddedildi', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 3:
        return { label: '⊘ İptal Edildi', bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
      case 0:
      default:
        return { label: '⏱ Beklemede', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isAdmin ? '👑 Personel İzin Talepleri' : '🏖️ İzin Taleplerim'}
          </Text>
          <Text style={styles.subtitle}>
            {isAdmin
              ? 'Personel izinlerini onaylayın, reddedin veya onaylı izinleri iptal edin'
              : 'İzin taleplerinizi oluşturun ve onay durumlarını takip edin'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>+ Yeni İzin</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={styles.kpiLabel}>Toplam Talep</Text>
        </View>

        <View style={[styles.kpiCard, stats.pending > 0 && styles.kpiCardAlert]}>
          <Text style={[styles.kpiNumber, { color: '#fbbf24' }]}>{stats.pending}</Text>
          <Text style={styles.kpiLabel}>Beklemede</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#34d399' }]}>{stats.approved}</Text>
          <Text style={styles.kpiLabel}>Onaylanan</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Personel veya mazeret ara..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Temizle</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Pills */}
      <View style={styles.filterPills}>
        <TouchableOpacity
          style={[styles.pill, statusFilter === 'all' && styles.pillActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.pillText, statusFilter === 'all' && styles.pillTextActive]}>
            Tümü ({stats.total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, statusFilter === '0' && styles.pillActive]}
          onPress={() => setStatusFilter('0')}
        >
          <Text style={[styles.pillText, statusFilter === '0' && styles.pillTextActive]}>
            Bekleyen ({stats.pending})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, statusFilter === '1' && styles.pillActive]}
          onPress={() => setStatusFilter('1')}
        >
          <Text style={[styles.pillText, statusFilter === '1' && styles.pillTextActive]}>
            Onaylanan ({stats.approved})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, (statusFilter === '2' || statusFilter === '3') && styles.pillActive]}
          onPress={() => setStatusFilter(statusFilter === '2' ? 'all' : '2')}
        >
          <Text style={[styles.pillText, (statusFilter === '2' || statusFilter === '3') && styles.pillTextActive]}>
            Reddedilen / İptal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaves List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
      ) : filteredLeaves.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🏖️</Text>
          <Text style={styles.emptyTitle}>Kayıtlı İzin Bulunamadı</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter !== 'all' ? 'Seçili filtreye uygun izin talebi yok.' : 'Henüz oluşturulmuş bir izin talebi bulunmuyor.'}
          </Text>
        </View>
      ) : (
        filteredLeaves.map((item, idx) => {
          const badge = getStatusBadge(item.status);
          const isPending = item.status === 0;
          const isApproved = item.status === 1;

          return (
            <View key={`leave-${item.id || idx}`} style={styles.leaveCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  {isAdmin && (
                    <Text style={styles.employeeName}>👤 {item.employeeName}</Text>
                  )}
                  <Text style={styles.dateRangeText}>
                    📅 {formatDateText(item.startDate)}
                  </Text>
                  <Text style={styles.durationBadgeText}>
                    ⏱ {formatDuration(item.startDate, item.endDate)}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Mazeret */}
              {item.reason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Mazeret:</Text>
                  <Text style={styles.reasonText}>{item.reason}</Text>
                </View>
              ) : null}

              {/* Admin Notu */}
              {item.adminNote ? (
                <View style={[styles.reasonBox, { backgroundColor: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.2)' }]}>
                  <Text style={[styles.reasonLabel, { color: '#38bdf8' }]}>Yönetici Notu:</Text>
                  <Text style={styles.reasonText}>{item.adminNote}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={styles.actionsRow}>
                {isPending && isAdmin && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => {
                        setAdminNote('');
                        setReviewModal({ leave: item, action: 'approve' });
                      }}
                    >
                      <Text style={styles.approveBtnText}>✓ Kabul Et</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => {
                        setAdminNote('');
                        setReviewModal({ leave: item, action: 'reject' });
                      }}
                    >
                      <Text style={styles.rejectBtnText}>✗ Reddet</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Personel veya Admin Bekleyen İptali */}
                {isPending && (!isAdmin || (currentEmployee && item.employeeId === currentEmployee.id)) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => {
                      setCancelReason('');
                      setCancelModal(item);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>⊘ İptal Et</Text>
                  </TouchableOpacity>
                )}

                {/* Onaylı İzin - Admin İptal Edebilir */}
                {isApproved && isAdmin && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelApprovedBtn]}
                    onPress={() => {
                      setCancelReason('');
                      setCancelModal(item);
                    }}
                  >
                    <Text style={styles.cancelApprovedBtnText}>🚫 İzni İptal Et (Slotları Aç)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* YENİ İZİN MODALI */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isAdmin ? 'Yeni Personel İzni Tanımla' : 'Yeni İzin Talebi Oluştur'}
              </Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {formError && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              {/* Admin için Personel Seçimi */}
              {isAdmin && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Personel *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                    {employees.map((emp, idx) => (
                      <TouchableOpacity
                        key={`leave-emp-${emp.id || idx}`}
                        style={[
                          styles.empChip,
                          selectedEmployeeId === emp.id.toString() && styles.empChipActive
                        ]}
                        onPress={() => setSelectedEmployeeId(emp.id.toString())}
                      >
                        <Text style={[
                          styles.empChipText,
                          selectedEmployeeId === emp.id.toString() && styles.empChipTextActive
                        ]}>
                          {emp.fullName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* İzin Türü */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Türü *</Text>
                <View style={styles.modeSegment}>
                  <TouchableOpacity
                    style={[styles.modeBtn, leaveMode === 'fullday' && styles.modeBtnActive]}
                    onPress={() => setLeaveMode('fullday')}
                  >
                    <Text style={[styles.modeBtnText, leaveMode === 'fullday' && styles.modeBtnTextActive]}>Tam Gün</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, leaveMode === 'hourly' && styles.modeBtnActive]}
                    onPress={() => setLeaveMode('hourly')}
                  >
                    <Text style={[styles.modeBtnText, leaveMode === 'hourly' && styles.modeBtnTextActive]}>Saatlik</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, leaveMode === 'range' && styles.modeBtnActive]}
                    onPress={() => setLeaveMode('range')}
                  >
                    <Text style={[styles.modeBtnText, leaveMode === 'range' && styles.modeBtnTextActive]}>Çoklu Gün</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tarih Alanı */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {leaveMode === 'range' ? 'Başlangıç Tarihi (YYYY-AA-GG) *' : 'İzin Tarihi (YYYY-AA-GG) *'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-09-25"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Çoklu Gün Bitiş Tarihi */}
              {leaveMode === 'range' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Bitiş Tarihi (YYYY-AA-GG) *</Text>
                  <TextInput
                    style={styles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2026-09-28"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              {/* Saatlik İzin Saatleri */}
              {leaveMode === 'hourly' && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Başlangıç (SS:DD) *</Text>
                    <TextInput
                      style={styles.input}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="09:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Bitiş (SS:DD) *</Text>
                    <TextInput
                      style={styles.input}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="14:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              )}

              {/* Mazeret */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>İzin Gerekçesi / Mazeret (İsteğe Bağlı)</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Örn: Yıllık izin, sağlık kontrolü, resmi işlemler..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {isAdmin ? 'İzni Onaylı Ekle' : 'Talebi Gönder'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADMİN ONAY / RET MODALI */}
      <Modal
        visible={!!reviewModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReviewModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: reviewModal?.action === 'approve' ? '#34d399' : '#f87171' }]}>
                {reviewModal?.action === 'approve' ? '✓ İzin Talebini Onayla' : '✗ İzin Talebini Reddet'}
              </Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {reviewModal && (
              <View style={{ paddingVertical: 10 }}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Personel: {reviewModal.leave.employeeName}</Text>
                  <Text style={styles.summaryText}>
                    Tarih: {formatDateText(reviewModal.leave.startDate)} — {formatDuration(reviewModal.leave.startDate, reviewModal.leave.endDate)}
                  </Text>
                  {reviewModal.leave.reason && (
                    <Text style={styles.summaryText}>Mazeret: {reviewModal.leave.reason}</Text>
                  )}
                </View>

                {reviewModal.action === 'approve' && (
                  <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>
                      💡 Onaylandığında personelin bu saatlerdeki randevu takvimi kilitlenecek ve randevu alınamayacaktır.
                    </Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {reviewModal.action === 'approve' ? 'Onay Notu (İsteğe Bağlı):' : 'Reddetme Gerekçesi (İsteğe Bağlı):'}
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    value={adminNote}
                    onChangeText={setAdminNote}
                    placeholder={reviewModal.action === 'approve' ? 'Örn: Onaylandı, iyi tatiller...' : 'Örn: Yoğun randevu talebi nedeniyle uygun değil...'}
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReviewModal(null)}
                disabled={reviewSubmitting}
              >
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  reviewModal?.action === 'reject' && { backgroundColor: '#ef4444' }
                ]}
                onPress={handleReviewSubmit}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={[styles.modalSubmitText, reviewModal?.action === 'reject' && { color: '#fff' }]}>
                    {reviewModal?.action === 'approve' ? 'Onayla ve Kilitle' : 'Talebi Reddet'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* İPTAL ONAY MODALI */}
      <Modal
        visible={!!cancelModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCancelModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#f87171' }]}>
                {cancelModal?.status === 1 ? '🚫 Onaylı İzni İptal Et' : '⊘ İzin Talebini İptal Et'}
              </Text>
              <TouchableOpacity onPress={() => setCancelModal(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {cancelModal && (
              <View style={{ paddingVertical: 10 }}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Personel: {cancelModal.employeeName}</Text>
                  <Text style={styles.summaryText}>
                    Tarih: {formatDateText(cancelModal.startDate)} — {formatDuration(cancelModal.startDate, cancelModal.endDate)}
                  </Text>
                </View>

                {cancelModal.status === 1 ? (
                  <View style={[styles.infoBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
                    <Text style={[styles.infoBannerText, { color: '#fca5a5' }]}>
                      ⚠️ Bu izin Onaylandı durumundadır. İptal ettiğinizde personelin bu saatlerdeki randevu slotları müşterilere tekrar açılacaktır.
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                    Beklemede olan bu izin talebinizi iptal etmek istediğinize emin misiniz?
                  </Text>
                )}

                {isAdmin && cancelModal.status === 1 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>İptal Gerekçesi (İsteğe Bağlı):</Text>
                    <TextInput
                      style={styles.input}
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      placeholder="Örn: Personel göreve geri çağrıldı..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModal(null)}
                disabled={cancelSubmitting}
              >
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleCancelSubmit}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalSubmitText, { color: '#fff' }]}>
                    {cancelModal?.status === 1 ? 'Evet, Onaylı İzni İptal Et' : 'Evet, İptal Et'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgMain
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16
    },
    createBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10
    },
    createBtnText: {
      color: '#000',
      fontSize: 12,
      fontWeight: '700'
    },
    kpiContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border
    },
    kpiCardAlert: {
      borderColor: '#fbbf24'
    },
    kpiNumber: {
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 2
    },
    kpiLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgInput,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      marginBottom: 12
    },
    searchInput: {
      flex: 1,
      height: 42,
      color: colors.textPrimary,
      fontSize: 13
    },
    filterPills: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap'
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    pillText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    pillTextActive: {
      color: '#000',
      fontWeight: '800'
    },
    emptyCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4
    },
    emptySubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center'
    },
    leaveCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 8
    },
    employeeName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2
    },
    dateRangeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2
    },
    durationBadgeText: {
      fontSize: 11,
      color: colors.textSecondary
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700'
    },
    reasonBox: {
      backgroundColor: colors.bgInput,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8
    },
    reasonLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 2
    },
    reasonText: {
      fontSize: 12,
      color: colors.textPrimary,
      lineHeight: 16
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12
    },
    actionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1
    },
    approveBtn: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    approveBtnText: {
      color: '#34d399',
      fontSize: 12,
      fontWeight: '700'
    },
    rejectBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    rejectBtnText: {
      color: '#f87171',
      fontSize: 12,
      fontWeight: '600'
    },
    cancelBtn: {
      backgroundColor: 'transparent',
      borderColor: colors.border
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600'
    },
    cancelApprovedBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    cancelApprovedBtnText: {
      color: '#f87171',
      fontSize: 11,
      fontWeight: '700'
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16
    },
    modalContent: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: colors.bgCard,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary
    },
    closeBtn: {
      fontSize: 18,
      color: colors.textMuted,
      padding: 4
    },
    formGroup: {
      marginBottom: 12
    },
    formLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 4
    },
    input: {
      backgroundColor: colors.bgInput,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.textPrimary,
      fontSize: 13
    },
    empChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.bgInput,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 6
    },
    empChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    empChipText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    empChipTextActive: {
      color: '#000',
      fontWeight: '800'
    },
    modeSegment: {
      flexDirection: 'row',
      backgroundColor: colors.bgInput,
      borderRadius: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border
    },
    modeBtn: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 8
    },
    modeBtnActive: {
      backgroundColor: colors.primary
    },
    modeBtnText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600'
    },
    modeBtnTextActive: {
      color: '#000',
      fontWeight: '800'
    },
    errorCard: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      marginBottom: 12
    },
    errorText: {
      color: '#f87171',
      fontSize: 12,
      lineHeight: 16
    },
    summaryCard: {
      backgroundColor: colors.bgInput,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10
    },
    summaryTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2
    },
    summaryText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16
    },
    infoBanner: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      marginBottom: 12
    },
    infoBannerText: {
      fontSize: 11,
      color: '#34d399',
      lineHeight: 16
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    modalCancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600'
    },
    modalSubmitBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      minWidth: 100,
      alignItems: 'center'
    },
    modalSubmitText: {
      color: '#000',
      fontSize: 12,
      fontWeight: '800'
    }
  });

