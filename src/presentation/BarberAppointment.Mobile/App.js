import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { BookingScreen } from './src/screens/BookingScreen';
import { MyAppointmentsScreen } from './src/screens/MyAppointmentsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme/colors';

const MainApp = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'book' | 'appointments' | 'profile'

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <View style={styles.appContainer}>
      {/* Active Screen View */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && (
          <HomeScreen onNavigateBooking={() => setActiveTab('book')} />
        )}
        {activeTab === 'book' && (
          <BookingScreen
            onBookingComplete={() => setActiveTab('appointments')}
            onCancelFlow={() => setActiveTab('home')}
          />
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

      {/* 4-Tab Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
            Keşfet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.bookTabItem, activeTab === 'book' && styles.bookTabItemActive]}
          onPress={() => setActiveTab('book')}
          activeOpacity={0.8}
        >
          <Text style={styles.bookIcon}>✂️</Text>
          <Text style={styles.bookLabel}>
            Randevu Al
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'appointments' && styles.navItemActive]}
          onPress={() => setActiveTab('appointments')}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={[styles.navLabel, activeTab === 'appointments' && styles.navLabelActive]}>
            Randevularım
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
            Profilim
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={colors.bgMain} />
        <MainApp />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
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
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  bookTabItem: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: -8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  bookTabItemActive: {
    backgroundColor: colors.primaryDark,
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
