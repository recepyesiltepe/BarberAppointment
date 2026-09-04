import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'barber_theme_preference';

/**
 * Gets the system's preferred color scheme ('dark' or 'light')
 */
const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Fallback to dark if matchMedia not supported
};

export const ThemeProvider = ({ children }) => {
  // themePreference can be 'system' | 'light' | 'dark'
  const [themePreference, setThemePreferenceState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors (e.g. incognito mode)
    }
    return 'system';
  });

  // Calculate current effective theme ('dark' or 'light')
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (themePreference === 'system') {
      return getSystemTheme();
    }
    return themePreference;
  });

  // Apply resolvedTheme to document element attribute data-theme
  useEffect(() => {
    const active = themePreference === 'system' ? getSystemTheme() : themePreference;
    setResolvedTheme(active);
    document.documentElement.setAttribute('data-theme', active);
  }, [themePreference]);

  // Listen to OS/browser theme preference changes dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e) => {
      if (themePreference === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [themePreference]);

  // Set user preference and persist
  const setThemePreference = (preference) => {
    if (preference !== 'system' && preference !== 'light' && preference !== 'dark') return;
    setThemePreferenceState(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Ignore storage errors
    }
  };

  // Quick toggle between light and dark (if on system, sets to the opposite of resolved)
  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setThemePreference('light');
    } else {
      setThemePreference('dark');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        theme: resolvedTheme,
        isDark: resolvedTheme === 'dark',
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
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

