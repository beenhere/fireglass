import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { CircleDot, Compass, LayoutGrid, Settings2, Sparkles, type LucideIcon } from 'lucide-react-native';
import { Glass } from './Glass';
import { Press } from './Press';
import { Txt } from './Txt';
import { C, R, SPRING } from './theme';
import { useKeyboardShown } from './useKeyboardShown';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  remote: { label: 'Remote', icon: CircleDot },
  apps: { label: 'Apps', icon: LayoutGrid },
  assistant: { label: 'Assistant', icon: Sparkles },
  discover: { label: 'Discover', icon: Compass },
  settings: { label: 'Settings', icon: Settings2 },
};

/** Floating glass tab bar; the active tab sits on a soft filled pill that springs across. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const [w, setW] = useState(0);
  const reduced = useReducedMotion();
  const n = state.routes.length;
  const x = useSharedValue(0);
  const slot = w / n;
  useEffect(() => {
    if (!w) return;
    x.value = reduced ? withTiming(state.index * slot, { duration: 0 }) : withSpring(state.index * slot, SPRING.settle);
  }, [state.index, slot, w, reduced, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (useKeyboardShown()) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <Glass radius={R.xl} strength={1.25} style={styles.bar}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w ? (
            <Animated.View style={[styles.pill, { width: slot - 10 }, pill]}>
              <View style={styles.pillFill} />
            </Animated.View>
          ) : null}
          {state.routes.map((r, i) => {
            const tab = TABS[r.name] ?? { label: r.name, icon: CircleDot };
            const on = i === state.index;
            const Icon = tab.icon;
            return (
              <Press key={r.key} onPress={() => navigateToTab(r.key)} feedback="tick" scaleTo={0.9} style={styles.item}
                accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label}>
                <Icon size={21} color={on ? C.text : C.faint} strokeWidth={on ? 2.2 : 1.8} />
                <Txt v="caption" color={on ? C.text : C.faint} style={{ fontSize: 11, marginTop: 3 }}>{tab.label}</Txt>
              </Press>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  // no real blur on Android, so a deeper base keeps labels readable over scrolled content
  bar: { padding: 6, backgroundColor: 'rgba(9,12,32,0.97)' },
  // Taller than its icon and label, so the active pill has room around them.
  item: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', left: 5, top: 3, bottom: 3 },
  pillFill: {
    flex: 1, borderRadius: 22, backgroundColor: 'rgba(169,184,255,0.2)',
    shadowColor: C.glow, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
});
