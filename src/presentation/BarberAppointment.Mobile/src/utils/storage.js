import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback storage when native storage or localStorage is unavailable
const memoryStore = new Map();

const hasLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

/**
 * Safe, platform-agnostic storage wrapper.
 * Prevents "Native module is null" warnings/errors across Web, Expo Go, and native runtimes.
 */
export const safeStorage = {
  getItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (hasLocalStorage()) {
          return window.localStorage.getItem(key);
        }
        return memoryStore.get(key) ?? null;
      }

      // Native platform (iOS / Android)
      return await AsyncStorage.getItem(key);
    } catch (error) {
      // Graceful fallback to in-memory store
      return memoryStore.get(key) ?? null;
    }
  },

  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web') {
        if (hasLocalStorage()) {
          window.localStorage.setItem(key, value);
        } else {
          memoryStore.set(key, value);
        }
        return;
      }

      // Native platform (iOS / Android)
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      // Graceful fallback to in-memory store
      memoryStore.set(key, value);
    }
  },

  removeItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (hasLocalStorage()) {
          window.localStorage.removeItem(key);
        } else {
          memoryStore.delete(key);
        }
        return;
      }

      // Native platform (iOS / Android)
      await AsyncStorage.removeItem(key);
    } catch (error) {
      // Graceful fallback to in-memory store
      memoryStore.delete(key);
    }
  }
};

