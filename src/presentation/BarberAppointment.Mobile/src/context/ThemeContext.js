import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { safeStorage } from '../utils/storage';
import { darkColors, lightColors, getThemeColors } from '../theme/colors';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'barber_mobile_theme_preference';

const getSystemScheme = () => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  // Default to 'system' to automatically follow the device's system theme
  const [themePreference, setThemePreferenceState] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState(() => getSystemScheme());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on app start from persistent storage
  useEffect(() => {
    let isMounted = true;
    const loadStoredPreference = async () => {
      try {
        const saved = await safeStorage.getItem(THEME_STORAGE_KEY);

        if (isMounted && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemePreferenceState(saved);
          if (saved === 'system') {
            setResolvedTheme(getSystemScheme());
          } else {
            setResolvedTheme(saved);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    loadStoredPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Appearance listener for live system changes (active ONLY when system mode is active)
  useEffect(() => {
    if (themePreference !== 'system') return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setResolvedTheme(colorScheme === 'dark' ? 'dark' : 'light');
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
    if (pref === 'system') {
      setResolvedTheme(getSystemScheme());
    } else {
      setResolvedTheme(pref);
    }

    try {
      await safeStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // Fallback gracefully
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
