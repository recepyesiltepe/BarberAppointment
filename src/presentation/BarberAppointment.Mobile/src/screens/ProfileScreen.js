import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, setApiUrl } from '../api/client';

export const ProfileScreen = () => {
  const { user, token, roleName, logout } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getApiUrl());

  const handleSaveUrl = () => {
    if (serverUrl) {
      setApiUrl(serverUrl.trim());
      setShowServerConfig(false);
      Alert.alert('Başarılı', `API URL güncellendi:\n${serverUrl}`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.fullName}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {roleName === 'Admin' ? '👑 Yönetici' : roleName === 'Employee' ? '✂️ Personel' : '👤 Müşteri'}
          </Text>
        </View>
      </View>

      {/* User Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Hesap Bilgileri</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kullanıcı Numarası (ID):</Text>
          <Text style={styles.infoVal}>#{user?.id}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>E-Posta:</Text>
          <Text style={styles.infoVal}>{user?.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefon:</Text>
          <Text style={styles.infoVal}>{user?.phone || 'Belirtilmedi'}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Hesap Durumu:</Text>
          <Text style={[styles.infoVal, { color: colors.success }]}>
            {user?.isActive ? '✓ Aktif Hesap' : 'Pasif'}
          </Text>
        </View>
      </View>

      {/* JWT Security Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🔑 Güvenlik & JWT</Text>
          <TouchableOpacity onPress={() => setShowToken(!showToken)}>
            <Text style={styles.toggleText}>{showToken ? 'Gizle' : 'Görüntüle'}</Text>
          </TouchableOpacity>
        </View>

        {showToken ? (
          <View style={{ marginTop: 10 }}>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText}>{token}</Text>
            </View>
            <Text style={styles.tokenHint}>
              Stateless Bearer Token — İsteklerde otomatik taşınır.
            </Text>
          </View>
        ) : (
          <Text style={styles.cardSub}>
            Oturumunuz HMAC-SHA512 ve JWT Bearer standardıyla şifrelenmiştir.
          </Text>
        )}
      </View>

      {/* Network Configuration */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🌐 Sunucu & API Ayarları</Text>
          <TouchableOpacity onPress={() => setShowServerConfig(!showServerConfig)}>
            <Text style={styles.toggleText}>{showServerConfig ? 'Kapat' : 'Düzenle'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardSub}>Bağlı Sunucu: {getApiUrl()}</Text>

        {showServerConfig && (
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrlState}
              placeholder="http://192.168.1.X:5184"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveUrl}>
              <Text style={styles.saveButtonText}>Sunucu URL Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>🚪 Güvenli Çıkış Yap</Text>
      </TouchableOpacity>
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
    paddingTop: 45,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    color: '#000',
    fontSize: 26,
    fontWeight: '800',
  },
  fullName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  email: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  toggleText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoVal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tokenBox: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  tokenText: {
    color: '#a7f3d0',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  tokenHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 15,
  }
});
