import React, { createContext, useContext, useState } from 'react';
import { authApi } from '../api/barberApi';
import { setClientToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data) {
        const { accessToken, user: userData } = res.data;
        setToken(accessToken);
        setUser(userData);
        setClientToken(accessToken);
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
        const { accessToken, user: newUser } = res.data;
        setToken(accessToken);
        setUser(newUser);
        setClientToken(accessToken);
        return { success: true, user: newUser };
      }
      throw new Error(res.message || 'Kayıt başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setClientToken(null);
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

  const value = {
    user,
    token,
    roleName: getRoleName(),
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout
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
