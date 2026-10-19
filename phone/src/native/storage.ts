import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

/** Small JSON documents in the app's documents folder (not secret). */
export function readJson<T>(name: string, fallback: T): T {
  try {
    const f = new File(Paths.document, name);
    return f.exists ? (JSON.parse(f.textSync()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown) {
  const f = new File(Paths.document, name);
  if (!f.exists) f.create();
  f.writeSync(JSON.stringify(value));
}

const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

/** Secrets (pairing tokens) in the Keychain / Android Keystore. */
export const secure = {
  get: (k: string) => SecureStore.getItemAsync(safeKey(k)),
  set: (k: string, v: string) => SecureStore.setItemAsync(safeKey(k), v),
  del: (k: string) => SecureStore.deleteItemAsync(safeKey(k)),
};
