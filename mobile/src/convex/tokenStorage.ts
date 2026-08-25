import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenStorage } from '@convex-dev/auth/react';

// Convex Auth's own docs suggest wrapping expo-secure-store for React
// Native (Keychain-backed). We start with AsyncStorage instead — it has no
// per-value size limit (SecureStore caps out around 2KB on iOS, which some
// refresh tokens can exceed) and needs no extra native setup. Revisit if a
// stronger at-rest guarantee is needed later.
export const asyncStorageTokenStorage: TokenStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key)
};
