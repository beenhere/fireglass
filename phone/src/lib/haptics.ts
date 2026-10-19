import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const on = Platform.OS !== 'web';
export const haptic = {
  tap: () => { if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  press: () => { if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  tick: () => { if (on) Haptics.selectionAsync().catch(() => {}); },
  ok: () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  err: () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};
