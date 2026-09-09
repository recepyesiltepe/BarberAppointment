import axios from 'axios';
import { Platform } from 'react-native';
import { safeStorage } from '../utils/storage';

// Android emülatöründe 10.0.2.2, iOS Simulator ve Web'de localhost
export const DEFAULT_API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:5184' 
  : 'http://localhost:5184';

let currentApiUrl = DEFAULT_API_URL;
let authToken = null;
let unauthorizedListeners = [];

export const setApiUrl = (url) => {
  if (url) {
    currentApiUrl = url;
    client.defaults.baseURL = url;
  }
};

export const getApiUrl = () => currentApiUrl;

export const setClientToken = (token) => {
  authToken = token;
};

export const addUnauthorizedListener = (listener) => {
  unauthorizedListeners.push(listener);
  return () => {
    unauthorizedListeners = unauthorizedListeners.filter((l) => l !== listener);
  };
};

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
};

const client = axios.create({
  baseURL: currentApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: JWT Bearer Token ekle (Hafızadan veya güvenli depolamadan)
client.interceptors.request.use(
  async (config) => {
    config.baseURL = currentApiUrl;
    let token = authToken;
    if (!token) {
      token = await safeStorage.getItem('barber_jwt_token');
      if (token) {
        authToken = token;
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Yanıtları, 401 durumunda sessiz yenilemeyi (Refresh Token) ve hataları yönet
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
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') ||
                             originalRequest?.url?.includes('/api/auth/refresh-token') ||
                             originalRequest?.url?.includes('/api/auth/register');

      // 401 Unauthorized ve henüz tekrar denenmemiş bir istekse Refresh Token dene
      if (error.response.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
        const refreshToken = await safeStorage.getItem('barber_refresh_token');

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
            // Raw axios ile döngüye girmeden refresh token isteği at
            const refreshResponse = await axios.post(`${currentApiUrl}/api/auth/refresh-token`, {
              refreshToken: refreshToken
            });

            const data = refreshResponse.data?.data;
            if (data?.accessToken && data?.refreshToken) {
              authToken = data.accessToken;
              await safeStorage.setItem('barber_jwt_token', data.accessToken);
              await safeStorage.setItem('barber_refresh_token', data.refreshToken);
              if (data.user) {
                await safeStorage.setItem('barber_user', JSON.stringify(data.user));
              }

              processQueue(null, data.accessToken);
              originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
              return client(originalRequest);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            authToken = null;
            await safeStorage.removeItem('barber_jwt_token');
            await safeStorage.removeItem('barber_refresh_token');
            await safeStorage.removeItem('barber_user');
            notifyUnauthorized();
            return Promise.reject(new Error('Oturum süreniz doldu, lütfen tekrar giriş yapınız.'));
          } finally {
            isRefreshing = false;
          }
        }

        // Refresh token yoksa oturumu kapat
        authToken = null;
        await safeStorage.removeItem('barber_jwt_token');
        await safeStorage.removeItem('barber_refresh_token');
        await safeStorage.removeItem('barber_user');
        notifyUnauthorized();
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
    return Promise.reject(new Error(error.message || 'Sunucuya bağlanılamadı.'));
  }
);

export default client;
