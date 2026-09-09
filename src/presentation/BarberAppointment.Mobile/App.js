import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { BookingScreen } from './src/screens/BookingScreen';
import { MyAppointmentsScreen } from './src/screens/MyAppointmentsScreen';
import { AdminManagementScreen } from './src/screens/AdminManagementScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const MainApp = () => {
  const { isAuthenticated, isInitializing, roleName } = useAuth();
  const { colors, isDark } = useTheme();
  const isAdmin = roleName === 'Admin';
  const isStaff = roleName === 'Employee' || roleName === 'Admin';
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'book' | 'admin' | 'appointments' | 'profile'

  if (isInitializing) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: colors.bgMain }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
          Oturum yükleniyor...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <View style={[styles.appContainer, { backgroundColor: colors.bgMain }]}>
      {/* Active Screen View */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && (
          <HomeScreen
            onNavigateBooking={() => setActiveTab('book')}
            onNavigateAdmin={() => setActiveTab('admin')}
          />
        )}
        {activeTab === 'book' && (
          <BookingScreen
            onBookingComplete={() => setActiveTab('appointments')}
            onCancelFlow={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminManagementScreen />
        )}
        {activeTab === 'appointments' && (
          <MyAppointmentsScreen
            onNavigateBooking={() => setActiveTab('book')}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen />
        )}
      </View>

      {/* Role-Aware Bottom Navigation Bar */}
      <View style={[
        styles.bottomNav,
        {
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderTopColor: colors.border
        }
      ]}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, { color: activeTab === 'home' ? colors.primary : colors.textSecondary }]}>
            {isStaff ? 'Genel Bakış' : 'Keşfet'}
          </Text>
        </TouchableOpacity>

        {/* Customer Booking Wizard */}
        {!isStaff && (
          <TouchableOpacity
            style={[styles.navItem, styles.bookTabItem, activeTab === 'book' && styles.bookTabItemActive, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('book')}
            activeOpacity={0.8}
          >
            <Text style={styles.bookIcon}>✂️</Text>
            <Text style={styles.bookLabel}>
              Randevu Al
            </Text>
          </TouchableOpacity>
        )}

        {/* Admin Management (Hizmetler & Personeller CRUD) */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'admin' && styles.navItemActive]}
            onPress={() => setActiveTab('admin')}
            activeOpacity={0.75}
          >
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={[styles.navLabel, { color: activeTab === 'admin' ? colors.primary : colors.textSecondary }]}>
              Yönetim
            </Text>
          </TouchableOpacity>
        )}

        {/* Appointments Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'appointments' && styles.navItemActive]}
          onPress={() => setActiveTab('appointments')}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={[styles.navLabel, { color: activeTab === 'appointments' ? colors.primary : colors.textSecondary }]}>
            {isStaff ? 'Randevular' : 'Randevularım'}
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navLabel, { color: activeTab === 'profile' ? colors.primary : colors.textSecondary }]}>
            Profilim
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ThemedContainer = () => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgMain }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.bgMain} />
      <MainApp />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <ThemedContainer />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  bookTabItem: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: -8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  bookTabItemActive: {
    opacity: 0.9,
  },
  bookIcon: {
    fontSize: 18,
  },
  bookLabel: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  }
});
