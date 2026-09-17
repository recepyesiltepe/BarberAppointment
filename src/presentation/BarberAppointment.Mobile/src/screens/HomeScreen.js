import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { barberApi, statsApi } from '../api/barberApi';

const DAYS_OF_WEEK = [
  { key: 1, label: 'Pzt' },
  { key: 2, label: 'Sal' },
  { key: 3, label: 'Çar' },
  { key: 4, label: 'Per' },
  { key: 5, label: 'Cum' },
  { key: 6, label: 'Cmt' },
  { key: 0, label: 'Paz' },
];

const formatWorkingDays = (workingDaysStr) => {
  if (!workingDaysStr) return 'Haftanın her günü';
  const days = workingDaysStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  if (days.length === 7) return 'Haftanın 7 Günü';
  if (days.length === 0) return 'Belirtilmemiş';
  return days
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(d => {
      const match = DAYS_OF_WEEK.find(item => item.key === d);
      return match ? match.label : d;
    })
    .join(', ');
};

export const HomeScreen = ({ onNavigateBooking, onNavigateAdmin }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, roleName, logout } = useAuth();
  const isAdmin = roleName === 'Admin';
  const isCustomer = roleName === 'Customer';

  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBarberModal, setSelectedBarberModal] = useState(null);

  const loadData = async () => {
    try {
      const promises = [
        barberApi.getServices().catch(() => ({ success: false, data: [] })),
        barberApi.getEmployees().catch(() => ({ success: false, data: [] }))
      ];

      if (isAdmin) {
        promises.push(statsApi.getSummary().catch(() => null));
      }

      const [srvRes, empRes, statsRes] = await Promise.all(promises);

      if (srvRes.success) setServices(srvRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.log('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRoleBadgeStyle = () => {
    switch (roleName) {
      case 'Admin':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Employee':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    }
  };

  const roleStyle = getRoleBadgeStyle();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Top Header Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hoş Geldiniz,</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
              <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
                {roleName === 'Admin' ? '👑 Salon Yöneticisi' : roleName === 'Employee' ? '✂️ Uzman Personel' : '👤 Müşteri'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        {/* Status Indicator */}
        <View style={styles.apiIndicator}>
          <View style={styles.greenDot} />
          <Text style={styles.apiText}>Sistem Aktif</Text>
        </View>
      </View>

      {/* Admin KPI Panel */}
      {isAdmin && stats && (
        <View style={[styles.card, { borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 2 }]}>
                📊 Salon Performans Özeti
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Canlı randevu ve ciro verileri</Text>
            </View>

            {onNavigateAdmin && (
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                onPress={onNavigateAdmin}
              >
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>Yönetim ›</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Toplam Randevu</Text>
              <Text style={styles.kpiValue}>{stats.totalAppointments}</Text>
              <Text style={[styles.kpiSub, { color: '#10b981' }]}>✓ {stats.activeAppointments} aktif</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Tahmini Ciro</Text>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>{stats.totalRevenue} ₺</Text>
              <Text style={styles.kpiSub}>İptaller hariç</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Aktif Personel</Text>
              <Text style={styles.kpiValue}>{stats.activeEmployees}</Text>
              <Text style={[styles.kpiSub, { color: '#38bdf8' }]}>Usta kuaför</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Aktif Hizmet</Text>
              <Text style={styles.kpiValue}>{stats.activeServices}</Text>
              <Text style={styles.kpiSub}>Katalogda yayında</Text>
            </View>
          </View>
        </View>
      )}

      {/* Customer Quick CTA */}
      {isCustomer && onNavigateBooking && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={onNavigateBooking}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#000' }}>✂️ Hemen Randevu Al</Text>
              <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.7)', marginTop: 4 }}>
                Uygun saatini seç, kuaförünü belirle ve anında yerini ayırt!
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#000' }}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Services List Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✂️ Hizmetlerimiz ({services.length})</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          services.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.listItem}
              onPress={() => isCustomer && onNavigateBooking && onNavigateBooking({ service: s })}
              activeOpacity={isCustomer ? 0.7 : 1}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.name}</Text>
                <Text style={styles.itemSubtitle}>⏱ {s.durationMinutes} dakika</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemPrice}>{s.price} ₺</Text>
                {isCustomer && (
                  <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700', marginTop: 2 }}>Randevu Al ›</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Employees Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👥 Uzman Kadromuz ({employees.length})</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          employees.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              style={styles.listItem}
              onPress={() => setSelectedBarberModal(emp)}
              activeOpacity={0.7}
            >
              <View style={styles.staffAvatar}>
                <Text style={styles.staffAvatarText}>{emp.fullName?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.itemTitle}>{emp.fullName}</Text>
                  {emp.services && emp.services.length > 0 && (
                    <View style={styles.serviceCountBadge}>
                      <Text style={styles.serviceCountBadgeText}>{emp.services.length} Hizmet</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.itemSubtitle, { color: colors.info }]}>{emp.title || 'Usta Kuaför'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>İncele</Text>
                <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '700' }}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Berber Detay Modalı */}
      <Modal
        visible={!!selectedBarberModal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBarberModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgCard }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={styles.barberModalAvatar}>
                  <Text style={styles.barberModalAvatarText}>
                    {selectedBarberModal?.fullName?.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedBarberModal?.fullName}</Text>
                  <Text style={{ fontSize: 12, color: colors.info, fontWeight: '600', marginTop: 2 }}>
                    {selectedBarberModal?.title || 'Usta Kuaför'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedBarberModal(null)}
                style={styles.modalCloseBtn}
              >
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sub-info Bar: Çalışma Saatleri ve Günleri */}
            <View style={styles.barberSubInfoBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12 }}>⏰</Text>
                <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                  Mesai: {selectedBarberModal?.workStartTime ? selectedBarberModal.workStartTime.substring(0, 5) : '09:00'} - {selectedBarberModal?.workEndTime ? selectedBarberModal.workEndTime.substring(0, 5) : '19:00'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 12 }}>📅</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Çalışma Günleri: <Text style={{ color: colors.primary, fontWeight: '600' }}>{formatWorkingDays(selectedBarberModal?.workingDays)}</Text>
                </Text>
              </View>
            </View>

            {/* Verdiği Hizmetler */}
            <View style={{ paddingVertical: 12, flexShrink: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                ✂️ Verdiği Hizmetler ({selectedBarberModal?.services?.length || 0})
              </Text>

              <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
                {(!selectedBarberModal?.services || selectedBarberModal.services.length === 0) ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 16, textAlign: 'center' }}>
                    Bu personel salonun tüm standart hizmetlerini verebilmektedir.
                  </Text>
                ) : (
                  selectedBarberModal.services.map((srv, idx) => (
                    <View key={`modal-srv-${srv.id || idx}`} style={styles.barberServiceItem}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                            {srv.name}
                          </Text>
                          {srv.isComposite && (
                            <View style={styles.packageTag}>
                              <Text style={styles.packageTagText}>Paket</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          ⏱ {srv.durationMinutes} dk
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                          {srv.price} ₺
                        </Text>
                        {isCustomer && (
                          <TouchableOpacity
                            style={styles.selectSrvBtn}
                            onPress={() => {
                              const emp = selectedBarberModal;
                              setSelectedBarberModal(null);
                              onNavigateBooking && onNavigateBooking({ employee: emp, service: srv });
                            }}
                          >
                            <Text style={styles.selectSrvBtnText}>Seç & Randevu Al</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedBarberModal(null)}
              >
                <Text style={styles.closeBtnText}>Kapat</Text>
              </TouchableOpacity>

              {isCustomer && (
                <TouchableOpacity
                  style={styles.bookBarberBtn}
                  onPress={() => {
                    const emp = selectedBarberModal;
                    setSelectedBarberModal(null);
                    onNavigateBooking && onNavigateBooking({ employee: emp });
                  }}
                >
                  <Text style={styles.bookBarberBtnText}>✂️ Bu Kuaförle Randevu Al</Text>
                </TouchableOpacity>
              )}
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
      paddingTop: 16,
      paddingBottom: 40
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    avatarText: {
      color: '#000',
      fontSize: 20,
      fontWeight: '800'
    },
    greeting: {
      color: colors.textSecondary,
      fontSize: 12
    },
    userName: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '700'
    },
    roleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700'
    },
    logoutButton: {
      backgroundColor: colors.borderSubtle || 'rgba(128, 128, 128, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8
    },
    logoutText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600'
    },
    apiIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6
    },
    greenDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success
    },
    apiText: {
      color: colors.textMuted,
      fontSize: 11
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10
    },
    kpiCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.bgMain,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    kpiLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600'
    },
    kpiValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginVertical: 2
    },
    kpiSub: {
      fontSize: 10,
      color: colors.textSecondary
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    itemTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600'
    },
    itemSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2
    },
    itemPrice: {
      color: colors.primaryLight,
      fontSize: 15,
      fontWeight: '700'
    },
    staffAvatar: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.info,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    staffAvatarText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 14
    },
    activeTag: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    activeTagText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '700'
    },
    serviceCountBadge: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.3)'
    },
    serviceCountBadgeText: {
      color: colors.info,
      fontSize: 10,
      fontWeight: '700'
    },
    // Berber Modal Stilleri
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end'
    },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '85%'
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    barberModalAvatar: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    barberModalAvatarText: {
      fontSize: 20,
      fontWeight: '800',
      color: '#000'
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary
    },
    modalCloseBtn: {
      padding: 6
    },
    barberSubInfoBar: {
      backgroundColor: colors.bgMain,
      padding: 12,
      borderRadius: 12,
      marginTop: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border
    },
    barberServiceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.bgMain,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border
    },
    packageTag: {
      backgroundColor: '#7c3aed',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4
    },
    packageTagText: {
      fontSize: 9,
      color: '#fff',
      fontWeight: '700'
    },
    selectSrvBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8
    },
    selectSrvBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#000'
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    closeBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    closeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary
    },
    bookBarberBtn: {
      flex: 2,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.primary
    },
    bookBarberBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#000'
    }
  });
