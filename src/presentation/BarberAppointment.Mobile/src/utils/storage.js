import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback storage
const memoryStore = new Map();

// Check if running on web with localStorage support
const hasLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

// Check classic NativeModules bridge for Expo Go / React Native classic
const getLegacyNativeStorage = () => {
  try {
    return NativeModules?.RNCAsyncStorage || NativeModules?.PlatformLocalStorage || null;
  } catch {
    return null;
  }
};

const nativeStorageGet = (key) =>
  new Promise((resolve) => {
    try {
      const mod = getLegacyNativeStorage();
      if (!mod || !mod.multiGet) return resolve(null);
      mod.multiGet([key], (errors, result) => {
        if (errors && errors.length) resolve(null);
        else resolve(result && result[0] ? result[0][1] : null);
      });
    } catch {
      resolve(null);
    }
  });

const nativeStorageSet = (key, value) =>
  new Promise((resolve) => {
    try {
      const mod = getLegacyNativeStorage();
      if (!mod || !mod.multiSet) return resolve(false);
      mod.multiSet([[key, String(value)]], (errors) => {
        if (errors && errors.length) resolve(false);
        else resolve(true);
      });
    } catch {
      resolve(false);
    }
  });

const nativeStorageRemove = (key) =>
  new Promise((resolve) => {
    try {
      const mod = getLegacyNativeStorage();
      if (!mod || !mod.multiRemove) return resolve(false);
      mod.multiRemove([key], (errors) => {
        if (errors && errors.length) resolve(false);
        else resolve(true);
      });
    } catch {
      resolve(false);
    }
  });

// Expo FileSystem storage (Guaranteed persistent file on device in Expo Go)
let expoFsModule = null;
let expoFsChecked = false;

const getExpoFileSystem = () => {
  if (expoFsChecked) return expoFsModule;
  expoFsChecked = true;
  try {
    expoFsModule = require('expo-file-system');
  } catch {
    expoFsModule = null;
  }
  return expoFsModule;
};

let cachedFileStore = null;

const readFileStore = async () => {
  if (cachedFileStore !== null) return cachedFileStore;
  try {
    const fs = getExpoFileSystem();
    if (!fs || !fs.Paths?.document) {
      cachedFileStore = {};
      return cachedFileStore;
    }
    const file = new fs.File(fs.Paths.document, 'app_kv_safe_store.json');
    if (file.exists) {
      const text = await file.text();
      cachedFileStore = JSON.parse(text || '{}');
    } else {
      cachedFileStore = {};
    }
  } catch {
    cachedFileStore = {};
  }
  return cachedFileStore;
};

const writeFileStore = async (store) => {
  cachedFileStore = store;
  try {
    const fs = getExpoFileSystem();
    if (!fs || !fs.Paths?.document) return false;
    const file = new fs.File(fs.Paths.document, 'app_kv_safe_store.json');
    if (!file.exists) {
      file.create();
    }
    file.write(JSON.stringify(store));
    return true;
  } catch (err) {
    console.warn('[safeStorage] File write error:', err);
    return false;
  }
};

/**
 * Safe, platform-agnostic multi-tier persistent storage wrapper.
 * Resolves persistent data across Web, Expo Go, and Native without wiping on restart.
 */
export const safeStorage = {
  getItem: async (key) => {
    // 1. Web localStorage
    if (Platform.OS === 'web') {
      if (hasLocalStorage()) {
        try {
          const val = window.localStorage.getItem(key);
          if (val !== null) return val;
        } catch {
          // ignore
        }
      }
      return memoryStore.get(key) ?? null;
    }

    // 2. Native: Try AsyncStorage (v3 turbo module if available)
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null && val !== undefined) {
        memoryStore.set(key, val);
        return val;
      }
    } catch {
      // AsyncStorage threw (e.g. Native module is null)
    }

    // 3. Native: Try classic NativeModules bridge
    try {
      const nativeVal = await nativeStorageGet(key);
      if (nativeVal !== null && nativeVal !== undefined) {
        memoryStore.set(key, nativeVal);
        return nativeVal;
      }
    } catch {
      // ignore
    }

    // 4. Native: Try Expo FileSystem persistent file
    try {
      const store = await readFileStore();
      if (store && store[key] !== undefined && store[key] !== null) {
        memoryStore.set(key, String(store[key]));
        return String(store[key]);
      }
    } catch {
      // ignore
    }

    // 5. Fallback to in-memory store
    return memoryStore.get(key) ?? null;
  },

  setItem: async (key, value) => {
    const stringVal = String(value);
    memoryStore.set(key, stringVal);

    if (Platform.OS === 'web') {
      if (hasLocalStorage()) {
        try {
          window.localStorage.setItem(key, stringVal);
        } catch {
          // ignore
        }
      }
      return;
    }

    // Native: Persist to all available native storage engines
    try {
      await AsyncStorage.setItem(key, stringVal);
    } catch {
      // AsyncStorage failed
    }

    try {
      await nativeStorageSet(key, stringVal);
    } catch {
      // Native module failed
    }

    try {
      const store = (await readFileStore()) || {};
      store[key] = stringVal;
      await writeFileStore(store);
    } catch {
      // File system failed
    }
  },

  removeItem: async (key) => {
    memoryStore.delete(key);

    if (Platform.OS === 'web') {
      if (hasLocalStorage()) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }

    try {
      await nativeStorageRemove(key);
    } catch {
      // ignore
    }

    try {
      const store = (await readFileStore()) || {};
      delete store[key];
      await writeFileStore(store);
    } catch {
      // ignore
    }
  }
};
