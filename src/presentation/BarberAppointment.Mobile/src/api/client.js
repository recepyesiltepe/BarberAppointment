import axios from 'axios';
import { Platform } from 'react-native';

// Android emülatöründe 10.0.2.2, iOS Simulator ve Web'de localhost
export const DEFAULT_API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:5184' 
  : 'http://localhost:5184';

let currentApiUrl = DEFAULT_API_URL;
let authToken = null;

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

const client = axios.create({
  baseURL: currentApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: JWT Bearer Token ekle
client.interceptors.request.use(
  (config) => {
    config.baseURL = currentApiUrl;
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standart ApiResponse'u ve hataları işle
client.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
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
