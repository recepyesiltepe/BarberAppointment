import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5184';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Her istekte JWT Bearer Token ekle
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('barber_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Yanıtları ve 401 durumunu yönet
client.interceptors.response.use(
  (response) => {
    // API her zaman ApiResponse formatı dönüyor
    return response.data;
  },
  (error) => {
    if (error.response) {
      // 401 Unauthorized durumunda yerel oturumu temizle
      if (error.response.status === 401) {
        localStorage.removeItem('barber_jwt_token');
        localStorage.removeItem('barber_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }

      // API'den dönen hata mesajını normalize et
      const apiError = error.response.data;
      if (apiError && apiError.errors && apiError.errors.length > 0) {
        return Promise.reject(new Error(apiError.errors.join('\n')));
      }
      if (apiError && apiError.message) {
        return Promise.reject(new Error(apiError.message));
      }
    }
    return Promise.reject(new Error(error.message || 'Sunucuya ulaşılamadı.'));
  }
);

export default client;
