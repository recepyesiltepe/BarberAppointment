import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { barberApi } from '../api/barberApi';
import { getApiUrl } from '../api/client';

export const HomeScreen = () => {
  const { user, token, roleName, logout } = useAuth();
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const loadData = async () => {
    try {
      const [srvRes, empRes] = await Promise.all([
        barberApi.getServices().catch(() => ({ success: false, data: [] })),
        barberApi.getEmployees().catch(() => ({ success: false, data: [] }))
      ]);

      if (srvRes.success) setServices(srvRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.log('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
                {roleName === 'Admin' ? '👑 Yönetici' : roleName === 'Employee' ? '✂️ Personel' : '👤 Müşteri'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        {/* API Connection Indicator */}
        <View style={styles.apiIndicator}>
          <View style={styles.greenDot} />
          <Text style={styles.apiText}>API Bağlantısı: {getApiUrl()}</Text>
        </View>
      </View>

      {/* JWT Token Inspector Toggle */}
      <TouchableOpacity
        style={styles.tokenToggleCard}
        onPress={() => setShowToken(!showToken)}
      >
        <Text style={styles.tokenToggleTitle}>
          🔑 {showToken ? 'JWT Token Bilgisini Gizle' : 'JWT Token & Claims İncele'}
        </Text>
      </TouchableOpacity>

      {showToken && (
        <View style={[styles.card, { borderColor: colors.primary }]}>
          <Text style={styles.sectionTitle}>Aktif Bearer Token</Text>
          <View style={styles.tokenBox}>
            <Text style={styles.tokenText}>{token}</Text>
          </View>

          <View style={styles.tokenGrid}>
            <View style={styles.tokenGridItem}>
              <Text style={styles.tokenLabel}>Kullanıcı ID:</Text>
              <Text style={styles.tokenVal}>#{user?.id}</Text>
            </View>
            <View style={styles.tokenGridItem}>
              <Text style={styles.tokenLabel}>E-Posta:</Text>
              <Text style={styles.tokenVal}>{user?.email}</Text>
            </View>
            <View style={styles.tokenGridItem}>
              <Text style={styles.tokenLabel}>Rol Kodu:</Text>
              <Text style={styles.tokenVal}>{user?.role} ({roleName})</Text>
            </View>
            <View style={styles.tokenGridItem}>
              <Text style={styles.tokenLabel}>Hesap:</Text>
              <Text style={[styles.tokenVal, { color: colors.success }]}>Aktif</Text>
            </View>
          </View>
        </View>
      )}

      {/* Services List Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✂️ Hizmetlerimiz ({services.length})</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          services.map(s => (
            <View key={s.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.name}</Text>
                <Text style={styles.itemSubtitle}>⏱ {s.durationMinutes} dakika</Text>
              </View>
              <Text style={styles.itemPrice}>{s.price} ₺</Text>
            </View>
          ))
        )}
      </View>

      {/* Employees Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👥 Uzman Kadromuz ({employees.length})</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          employees.map(emp => (
            <View key={emp.id} style={styles.listItem}>
              <View style={styles.staffAvatar}>
                <Text style={styles.staffAvatarText}>{emp.fullName?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{emp.fullName}</Text>
                <Text style={[styles.itemSubtitle, { color: colors.info }]}>{emp.title || 'Usta Kuaför'}</Text>
              </View>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>Aktif</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  apiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  apiText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  tokenToggleCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  tokenToggleTitle: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tokenBox: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  tokenText: {
    color: '#a7f3d0',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tokenGridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 6,
  },
  tokenLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  tokenVal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '700',
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  staffAvatarText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activeTagText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  }
});
