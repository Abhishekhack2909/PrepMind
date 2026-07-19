import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Unified storage engine for PrepMind.
 * Mobile: Uses expo-secure-store (native, encrypted, stable in Expo Go)
 * Web: Uses window.localStorage (standard browser storage)
 *
 * Prevents the "AsyncStorage native module is null" crash on both Web and Mobile devices.
 */
export const appStorage = { // for testing only 
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('SecureStore getItem failed:', e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('SecureStore setItem failed:', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore deleteItem failed:', e);
    }
  },
};
