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
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => {
    // API her zaman ApiResponse formatı dönüyor
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      // 401 Unauthorized ve henüz tekrar denenmemiş bir istekse Refresh Token dene
      const isAuthEndpoint = originalRequest.url?.includes('/api/auth/login') ||
                             originalRequest.url?.includes('/api/auth/refresh-token') ||
                             originalRequest.url?.includes('/api/auth/register');

      if (error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
        const refreshToken = localStorage.getItem('barber_refresh_token');

        if (refreshToken) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Raw axios kullanarak döngüye girmeyi engelle
            const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
              refreshToken: refreshToken
            });

            const data = refreshResponse.data?.data;
            if (data?.accessToken && data?.refreshToken) {
              localStorage.setItem('barber_jwt_token', data.accessToken);
              localStorage.setItem('barber_refresh_token', data.refreshToken);
              if (data.user) {
                localStorage.setItem('barber_user', JSON.stringify(data.user));
              }

              processQueue(null, data.accessToken);
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
              return client(originalRequest);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            localStorage.removeItem('barber_jwt_token');
            localStorage.removeItem('barber_refresh_token');
            localStorage.removeItem('barber_user');
            window.dispatchEvent(new Event('auth:unauthorized'));
            return Promise.reject(new Error('Oturum süreniz doldu, lütfen tekrar giriş yapınız.'));
          } finally {
            isRefreshing = false;
          }
        }

        // Refresh token yoksa oturumu kapat
        localStorage.removeItem('barber_jwt_token');
        localStorage.removeItem('barber_refresh_token');
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
