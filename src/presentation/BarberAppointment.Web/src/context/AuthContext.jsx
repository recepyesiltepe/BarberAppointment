import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Uygulama ilk açıldığında localStorage'dan oturumu geri yükle
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('barber_jwt_token');
      const savedUser = localStorage.getItem('barber_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        
        // Arka planda profilin güncelliğini doğrula
        try {
          const profileRes = await authApi.getProfile();
          if (profileRes.success && profileRes.data) {
            setUser(profileRes.data);
            localStorage.setItem('barber_user', JSON.stringify(profileRes.data));
          }
        } catch {
          // Token geçersizleşmişse temizle
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();

    // 401 Unauthorized event dinleyicisi
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data) {
        const { accessToken, user: userData } = res.data;
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('barber_jwt_token', accessToken);
        localStorage.setItem('barber_user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      throw new Error(res.message || 'Giriş yapılamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(userData);
      if (res.success && res.data) {
        const { accessToken, user: registeredUser, requiresEmailVerification, simulationToken } = res.data;
        if (accessToken && !requiresEmailVerification) {
          setToken(accessToken);
          setUser(registeredUser);
          localStorage.setItem('barber_jwt_token', accessToken);
          localStorage.setItem('barber_user', JSON.stringify(registeredUser));
        }
        return {
          success: true,
          user: registeredUser,
          requiresEmailVerification: requiresEmailVerification ?? true,
          simulationToken,
          message: res.message
        };
      }
      throw new Error(res.message || 'Kayıt işlemi başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('barber_jwt_token');
    localStorage.removeItem('barber_user');
  };

  const getRoleName = () => {
    if (!user) return '';
    switch (user.role) {
      case 2: return 'Admin';
      case 3: return 'Employee';
      case 1:
      default: return 'Customer';
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('barber_user', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshProfile = async () => {
    try {
      const profileRes = await authApi.getProfile();
      if (profileRes.success && profileRes.data) {
        setUser(profileRes.data);
        localStorage.setItem('barber_user', JSON.stringify(profileRes.data));
        return profileRes.data;
      }
    } catch {
      // ignore
    }
  };

  const value = {
    user,
    token,
    roleName: getRoleName(),
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
