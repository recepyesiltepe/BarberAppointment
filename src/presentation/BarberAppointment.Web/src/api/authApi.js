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

  // Profil Güncelle
  updateProfile: async (profileData) => {
    return await client.put('/api/auth/me', profileData);
  },

  // Şifre Değiştir
  changePassword: async (passwordData) => {
    return await client.put('/api/auth/change-password', passwordData);
  },

  // E-Posta Doğrula
  verifyEmail: async (data) => {
    return await client.post('/api/auth/verify-email', data);
  },

  // Doğrulama E-Postasını Yeniden Gönder
  resendVerificationEmail: async (email) => {
    return await client.post('/api/auth/resend-verification-email', { email });
  },

  // Şifremi Unuttum (Bağlantı/Kod İste)
  forgotPassword: async (email) => {
    return await client.post('/api/auth/forgot-password', { email });
  },

  // Yeni Şifre Belirle (Token ile)
  resetPassword: async (resetData) => {
    return await client.post('/api/auth/reset-password', resetData);
  }
};
