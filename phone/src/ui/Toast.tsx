import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { Txt } from './Txt';
import { C, R } from './theme';

type T = { id: number; text: string; tone: 'info' | 'error' };
const useToasts = create<{ t: T | null }>(() => ({ t: null }));
let n = 0;

export function toast(text: string, tone: T['tone'] = 'info') {
  useToasts.setState({ t: { id: ++n, text, tone } });
}

/** One quiet message at a time, dropping in from the top. */
export function ToastHost() {
  const t = useToasts((s) => s.t);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => useToasts.setState((s) => (s.t?.id === t.id ? { t: null } : s)), 3200);
    return () => clearTimeout(h);
  }, [t]);
  if (!t) return null;
  const Icon = t.tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="none">
      <Animated.View key={t.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)} style={styles.toast}>
        <Icon size={18} color={t.tone === 'error' ? C.bad : C.live} />
        <Txt v="label" style={{ flexShrink: 1 }}>{t.text}</Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: R.lg,
    backgroundColor: '#1A2150', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
});
