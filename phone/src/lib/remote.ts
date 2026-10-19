import { ApiError } from './api';
import { haptic } from './haptics';
import type { Key } from './types';
import { activeClient, useStore } from '@/state/store';
import { toast } from '@/ui/Toast';
import { friendlyError } from './execute';

let lastErrorAt = 0;

/** Sends one remote key. Errors surface as a toast (at most every few seconds while mashing). */
export async function sendKey(key: Key, long = false) {
  const c = activeClient();
  if (!c) return;
  try {
    const r = await c.key(key, long);
    if (!r.ok) throw new ApiError(200, r.error);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'needs_bootstrap') useStore.getState().refreshInfo();
    if (Date.now() - lastErrorAt > 3000) {
      lastErrorAt = Date.now();
      haptic.err();
      toast(friendlyError(e), 'error');
    }
  }
}
