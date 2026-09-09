import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { barberApi } from '../api/barberApi';
import { formatTurkishPhone } from '../utils/phoneUtils';

export const MyAppointmentsScreen = ({ onNavigateBooking }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, roleName } = useAuth();
  const isStaff = roleName === 'Employee' || roleName === 'Admin';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'history' | 'all'
  const [error, setError] = useState(null);

  const fetchAppointments = async () => {
    setError(null);
    try {
      const res = isStaff
        ? await barberApi.getAllAppointments()
        : await barberApi.getMyAppointments();

      if (res.success) {
        const list = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setAppointments(list);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      setError(err.message || 'Randevular yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user, roleName]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleComplete = (id, serviceName) => {
    Alert.alert(
      'Randevuyu Tamamla',
      `"${serviceName}" randevusunu tamamlandı olarak işaretlemek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: '✓ Evet, Tamamlandı',
          onPress: async () => {
            try {
              const res = await barberApi.completeAppointment(id);
              if (res.success) {
                Alert.alert('Başarılı 🎉', 'Randevu başarıyla tamamlandı olarak işaretlendi.');
                fetchAppointments();
              } else {
                Alert.alert('Hata', res.message || 'İşlem gerçekleştirilemedi.');
              }
            } catch (err) {
              Alert.alert('Hata', err.message || 'İşlem gerçekleştirilemedi.');
            }
          }
        }
      ]
    );
  };

  const handleCancel = (id, serviceName, timeStr) => {
    Alert.alert(
      'Randevu İptali',
      `"${serviceName}" randevunuzu iptal etmek istediğinize emin misiniz?\n\nZaman: ${timeStr}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await barberApi.cancelAppointment(id);
              if (res.success) {
                Alert.alert('İptal Edildi', 'Randevu başarıyla iptal edildi.');
                fetchAppointments();
              }
            } catch (err) {
              Alert.alert('Hata', err.message || 'İptal işlemi gerçekleştirilemedi.');
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 2:
        return { label: '✓ Onaylandı', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 3:
        return { label: '✓ Tamamlandı', bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 4:
        return { label: '✗ İptal Edildi', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 1:
      default:
        return { label: '⏱ Bekliyor', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  // Kalan Süre Hesaplama
  const getRelativeTime = (startAt) => {
    const now = new Date();
    const start = new Date(startAt);
    const diffMs = start - now;

    if (diffMs < 0) return 'Tamamlandı / Geçmiş';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `⏳ ${diffDays} gün sonra`;
    if (diffHours > 0) return `⏳ ${diffHours} saat sonra`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `⏳ ${diffMins} dakika sonra`;
  };

  // Filtreleme
  const filteredAppointments = appointments.filter(a => {
    const isPast = new Date(a.startAt) < new Date() || a.status === 3 || a.status === 4;
    if (filterTab === 'upcoming') return !isPast && (a.status === 1 || a.status === 2);
    if (filterTab === 'history') return isPast;
    return true;
  });

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
        <Text style={styles.title}>
          {roleName === 'Admin' ? '👑 Salon Randevuları' : isStaff ? '✂️ Randevu Yönetimi' : '📅 Randevularım'}
        </Text>
        <Text style={styles.subtitle}>
          {isStaff ? 'Müşteri randevularını denetleyin ve durumlarını güncelleyin' : 'Geçmiş ve yaklaşan tüm randevu kayıtlarınız'}
        </Text>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.filterPills}>
        <TouchableOpacity
          style={[styles.pill, filterTab === 'upcoming' && styles.pillActive]}
          onPress={() => setFilterTab('upcoming')}
          activeOpacity={0.75}
        >
          <Text style={[styles.pillText, filterTab === 'upcoming' && styles.pillTextActive]}>
            Yaklaşan ({appointments.filter(a => (a.status === 1 || a.status === 2) && new Date(a.startAt) >= new Date()).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, filterTab === 'history' && styles.pillActive]}
          onPress={() => setFilterTab('history')}
          activeOpacity={0.75}
        >
          <Text style={[styles.pillText, filterTab === 'history' && styles.pillTextActive]}>
            Geçmiş ({appointments.filter(a => a.status === 3 || a.status === 4 || new Date(a.startAt) < new Date()).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, filterTab === 'all' && styles.pillActive]}
          onPress={() => setFilterTab('all')}
          activeOpacity={0.75}
        >
          <Text style={[styles.pillText, filterTab === 'all' && styles.pillTextActive]}>
            Tümü ({appointments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Box with Retry */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAppointments} activeOpacity={0.75}>
            <Text style={styles.retryButtonText}>Yeniden Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✂️</Text>
          <Text style={styles.emptyTitle}>
            {filterTab === 'upcoming' ? 'Yaklaşan Randevunuz Yok' : 'Bu kategoride randevu bulunamadı'}
          </Text>
          <Text style={styles.emptySub}>
            {isStaff
              ? 'Şu anda bu kriterde bekleyen veya onaylanmış bir müşteri randevusu bulunmuyor.'
              : 'Dilediğiniz uzman kuaför ve uygun saati seçerek hemen randevunuzu oluşturun.'}
          </Text>
          {!isStaff && onNavigateBooking && (
            <TouchableOpacity style={styles.bookButton} onPress={onNavigateBooking} activeOpacity={0.8}>
              <Text style={styles.bookButtonText}>+ Hemen Randevu Al</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        filteredAppointments.map((a) => {
          const badge = getStatusBadge(a.status);
          const start = new Date(a.startAt);
          const end = new Date(a.endAt);
          const dateStr = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
          const timeStr = `${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
          const countdown = getRelativeTime(a.startAt);
          const canCancel = (a.status === 1 || a.status === 2) && new Date(a.startAt) >= new Date();

          return (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{a.serviceName}</Text>
                  {isStaff ? (
                    <View style={{ marginTop: 2 }}>
                      <Text style={styles.employeeName}>👤 Müşteri: {a.customerName || a.userName || 'Kayıtlı Müşteri'}</Text>
                      {a.customerPhone ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                          📞 {formatTurkishPhone(a.customerPhone)}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.employeeName}>Kuaför: {a.employeeName}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Countdown badge if active */}
              {canCancel && (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tarih & Saat:</Text>
                <Text style={styles.infoVal}>{dateStr} ({timeStr})</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hizmet Süresi & Tutar:</Text>
                <Text style={styles.priceVal}>{a.durationMinutes} dk • {a.price} ₺</Text>
              </View>

              {a.notes ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Notlar:</Text>
                  <Text style={styles.notesVal}>{a.notes}</Text>
                </View>
              ) : null}

              {/* İşlem Butonları */}
              {isStaff && (a.status === 1 || a.status === 2) ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                    onPress={() => handleComplete(a.id, a.serviceName)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '700' }}>✓ Tamamlandı</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}
                    onPress={() => handleCancel(a.id, a.serviceName, `${dateStr} ${timeStr}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>✗ İptal Et</Text>
                  </TouchableOpacity>
                </View>
              ) : canCancel ? (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(a.id, a.serviceName, `${dateStr} ${timeStr}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Randevuyu İptal Et</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 45,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filterPills: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 15,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  employeeName: {
    color: colors.info,
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countdownBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countdownText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoVal: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  priceVal: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  notesVal: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    maxWidth: '60%',
    textAlign: 'right',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  cancelButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: colors.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  }
});
