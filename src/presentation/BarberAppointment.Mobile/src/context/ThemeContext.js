import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, getThemeColors } from '../theme/colors';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'barber_mobile_theme_preference';

const getSystemScheme = () => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' ? 'light' : 'dark';
};

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState(() => getSystemScheme());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on app start from persistent storage
  useEffect(() => {
    const loadStoredPreference = async () => {
      try {
        let saved = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        }
        if (!saved) {
          saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        }

        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemePreferenceState(saved);
          if (saved === 'system') {
            setResolvedTheme(getSystemScheme());
          } else {
            setResolvedTheme(saved);
          }
        }
      } catch (err) {
        console.warn('Tema tercihi yüklenirken hata:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadStoredPreference();
  }, []);

  // Dynamic Appearance listener for live system changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themePreference === 'system') {
        setResolvedTheme(colorScheme === 'light' ? 'light' : 'dark');
      }
    });

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, [themePreference]);

  // Update resolved theme when preference changes
  useEffect(() => {
    if (themePreference === 'system') {
      setResolvedTheme(getSystemScheme());
    } else {
      setResolvedTheme(themePreference);
    }
  }, [themePreference]);

  const setThemePreference = async (pref) => {
    if (pref !== 'system' && pref !== 'light' && pref !== 'dark') return;
    setThemePreferenceState(pref);

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, pref);
      }
      await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (err) {
      console.warn('Tema tercihi kaydedilirken hata:', err);
    }
  };

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setThemePreference('light');
    } else {
      setThemePreference('dark');
    }
  };

  const currentColors = getThemeColors(resolvedTheme);
  const isDark = resolvedTheme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        theme: resolvedTheme,
        isDark,
        colors: currentColors,
        isLoaded,
        setThemePreference,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a Mobile ThemeProvider');
  }
  return context;
};
