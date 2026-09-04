export const darkColors = {
  bgMain: '#0a0d14',
  bgCard: '#111827',
  bgCardHover: '#1f2937',
  bgInput: '#0f172a',
  
  primary: '#f59e0b',
  primaryLight: '#fbbf24',
  primaryDark: '#d97706',
  
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  
  border: 'rgba(255, 255, 255, 0.1)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderActive: '#f59e0b',
  borderFocus: '#f59e0b',
  
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.35)',
  
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  dangerBorder: 'rgba(239, 68, 68, 0.35)',
  
  info: '#38bdf8',
  infoBg: 'rgba(56, 189, 248, 0.15)',
  infoBorder: 'rgba(56, 189, 248, 0.35)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  warningBorder: 'rgba(245, 158, 11, 0.35)',
  
  skeleton: 'rgba(255, 255, 255, 0.06)'
};

export const lightColors = {
  bgMain: '#f8fafc',
  bgCard: '#ffffff',
  bgCardHover: '#f1f5f9',
  bgInput: '#ffffff',
  
  primary: '#d97706',
  primaryLight: '#f59e0b',
  primaryDark: '#b45309',
  
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  
  border: 'rgba(0, 0, 0, 0.1)',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  borderActive: '#d97706',
  borderFocus: '#d97706',
  
  success: '#059669',
  successBg: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  
  danger: '#dc2626',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
  
  info: '#0284c7',
  infoBg: 'rgba(56, 189, 248, 0.12)',
  infoBorder: 'rgba(56, 189, 248, 0.3)',
  
  warning: '#d97706',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  
  skeleton: 'rgba(0, 0, 0, 0.06)'
};

export const getThemeColors = (theme) => {
  return theme === 'light' ? lightColors : darkColors;
};

// Default backward compatibility
export const colors = darkColors;
