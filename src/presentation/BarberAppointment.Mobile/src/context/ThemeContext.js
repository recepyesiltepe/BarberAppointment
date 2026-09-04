import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { darkColors, lightColors, getThemeColors } from '../theme/colors';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'barber_mobile_theme_preference';

const getSystemScheme = () => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' ? 'light' : 'dark';
};

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          return saved;
        }
      } catch {
        // Fallback
      }
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (themePreference === 'system') {
      return getSystemScheme();
    }
    return themePreference;
  });

  // Dynamic Appearance listener
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

  const setThemePreference = (pref) => {
    if (pref !== 'system' && pref !== 'light' && pref !== 'dark') return;
    setThemePreferenceState(pref);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, pref);
      } catch {
        // Fallback
      }
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

