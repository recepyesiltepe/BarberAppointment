import client from './client';

export const authApi = {
  // Giriş Yap
  login: async (credentials) => {
    return await client.post('/api/auth/login', credentials);
  },

  // Kayıt Ol
  register: async (userData) => {
    return await client.post('/api/auth/register', userData);
  },

  // Profilimi Getir (Token ile)
  getProfile: async () => {
    return await client.get('/api/auth/me');
  },

  // Şifre Değiştir
  changePassword: async (passwordData) => {
    return await client.put('/api/auth/change-password', passwordData);
  }
};
