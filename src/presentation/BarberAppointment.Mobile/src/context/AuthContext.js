import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/barberApi';
import { setClientToken, addUnauthorizedListener } from '../api/client';
import { safeStorage } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Uygulama açılışında kayıtlı oturumu güvenli depolamadan yükle
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await safeStorage.getItem('barber_jwt_token');
        const storedUserJson = await safeStorage.getItem('barber_user');

        if (storedToken && storedUserJson) {
          const parsedUser = JSON.parse(storedUserJson);
          setToken(storedToken);
          setUser(parsedUser);
          setClientToken(storedToken);
        }
      } catch (e) {
        console.warn('Oturum geri yüklenirken hata:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // 401 Unauthorized durumunda oturumu kapatma dinleyicisi
  useEffect(() => {
    const unsubscribe = addUnauthorizedListener(() => {
      setToken(null);
      setUser(null);
      setClientToken(null);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data) {
        const { accessToken, refreshToken, user: userData } = res.data;
        setToken(accessToken);
        setUser(userData);
        setClientToken(accessToken);

        // Depolamaya kalıcı olarak kaydet
        await safeStorage.setItem('barber_jwt_token', accessToken);
        if (refreshToken) {
          await safeStorage.setItem('barber_refresh_token', refreshToken);
        }
        if (userData) {
          await safeStorage.setItem('barber_user', JSON.stringify(userData));
        }

        return { success: true, user: userData };
      }
      throw new Error(res.message || 'Giriş başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(userData);
      if (res.success && res.data) {
        const { accessToken, refreshToken, user: newUser, requiresEmailVerification, simulationToken } = res.data;
        if (accessToken && !requiresEmailVerification) {
          setToken(accessToken);
          setUser(newUser);
          setClientToken(accessToken);

          await safeStorage.setItem('barber_jwt_token', accessToken);
          if (refreshToken) {
            await safeStorage.setItem('barber_refresh_token', refreshToken);
          }
          if (newUser) {
            await safeStorage.setItem('barber_user', JSON.stringify(newUser));
          }
        }
        return {
          success: true,
          user: newUser,
          requiresEmailVerification: requiresEmailVerification ?? true,
          simulationToken,
          message: res.message
        };
      }
      throw new Error(res.message || 'Kayıt başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setClientToken(null);
    await safeStorage.removeItem('barber_jwt_token');
    await safeStorage.removeItem('barber_refresh_token');
    await safeStorage.removeItem('barber_user');
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

  const updateUser = async (updatedFields) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...updatedFields } : prev;
      if (next) {
        safeStorage.setItem('barber_user', JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  const value = {
    user,
    token,
    roleName: getRoleName(),
    isAuthenticated: !!token && !!user,
    isLoading,
    isInitializing,
    login,
    register,
    logout,
    updateUser
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
