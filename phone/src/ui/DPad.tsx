import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import type { Key } from '@/lib/types';
import { C, SPRING } from './theme';
import { Txt } from './Txt';

type Dir = 'up' | 'down' | 'left' | 'right';
const DIRS: { d: Dir; Icon: typeof ChevronUp; angle: number }[] = [
  { d: 'up', Icon: ChevronUp, angle: -90 },
  { d: 'right', Icon: ChevronRight, angle: 0 },
  { d: 'down', Icon: ChevronDown, angle: 90 },
  { d: 'left', Icon: ChevronLeft, angle: 180 },
];

const REPEAT_AFTER = 380;
const REPEAT_EVERY = 110;
const LONG_SELECT = 550;

/**
 * Big circular D-pad with select in the middle. Directions fire on touch and repeat while held;
 * select fires on release, or as a long press when held. The touched part glows.
 */
export function DPad({ size, onKey }: { size: number; onKey: (k: Key, long?: boolean) => void }) {
  const reduced = useReducedMotion();
  const inner = size * 0.36;
  const glow = { up: useSharedValue(0), down: useSharedValue(0), left: useSharedValue(0), right: useSharedValue(0), select: useSharedValue(0) };
  const tilt = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const held = useRef<Dir | 'select' | null>(null);
  const longFired = useRef(false);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  const regionAt = (e: GestureResponderEvent): Dir | 'select' | null => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    const dx = x - size / 2, dy = y - size / 2;
    const r = Math.hypot(dx, dy);
    if (r > size / 2 + 6) return null;
    if (r < inner / 2 + 4) return 'select';
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  };

  const down = (e: GestureResponderEvent) => {
    const reg = regionAt(e);
    held.current = reg;
    if (!reg) return;
    glow[reg].value = withTiming(1, { duration: 70 });
    if (!reduced) tilt.value = withSpring(1, SPRING.press);
    if (reg === 'select') {
      longFired.current = false;
      haptic.press();
      timers.current.push(setTimeout(() => {
        longFired.current = true;
        haptic.ok();
        onKey('select', true);
      }, LONG_SELECT));
      return;
    }
    haptic.press();
    onKey(reg);
    timers.current.push(setTimeout(function rep() {
      if (held.current !== reg) return;
      haptic.tick();
      onKey(reg);
      timers.current.push(setTimeout(rep, REPEAT_EVERY));
    }, REPEAT_AFTER));
  };

  const up = () => {
    const reg = held.current;
    held.current = null;
    clear();
    tilt.value = withSpring(0, SPRING.settle);
    if (!reg) return;
    glow[reg].value = withTiming(0, { duration: 320 });
    if (reg === 'select' && !longFired.current) onKey('select');
  };

  const pad = useAnimatedStyle(() => ({ transform: [{ scale: 1 - tilt.value * 0.015 }] }));
  const center = useAnimatedStyle(() => ({ transform: [{ scale: 1 - glow.select.value * 0.07 }] }));
  const centerGlow = useAnimatedStyle(() => ({ opacity: glow.select.value }));

  return (
    <Pressable onPressIn={down} onPressOut={up} accessibilityRole="adjustable" accessibilityLabel="Direction pad"
      accessibilityActions={[{ name: 'increment', label: 'Up' }, { name: 'decrement', label: 'Down' }, { name: 'activate', label: 'Select' }]}
      onAccessibilityAction={(e) => onKey(e.nativeEvent.actionName === 'increment' ? 'up' : e.nativeEvent.actionName === 'decrement' ? 'down' : 'select')}>
      <Animated.View style={[{ width: size, height: size }, pad]} pointerEvents="none">
        {/* ring */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="ringBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.17} />
              <Stop offset="0.55" stopColor="#fff" stopOpacity={0.07} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0.11} />
            </LinearGradient>
            <LinearGradient id="ringRim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.55} />
              <Stop offset="0.5" stopColor="#fff" stopOpacity={0.08} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0.2} />
            </LinearGradient>
            <LinearGradient id="selBody" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#C9D2FF" stopOpacity={0.36} />
              <Stop offset="1" stopColor="#6E3FB8" stopOpacity={0.28} />
            </LinearGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="url(#ringBody)" stroke="url(#ringRim)" strokeWidth={1.3} />
          <Circle cx={size / 2} cy={size / 2} r={inner / 2 + 10} fill="rgba(7,11,31,0.22)" />
        </Svg>

        {DIRS.map(({ d, Icon, angle }) => (
          <DirGlow key={d} v={glow[d]} size={size} inner={inner} angle={angle} Icon={Icon} />
        ))}

        {/* select */}
        <Animated.View style={[styles.center, { width: inner, height: inner, left: (size - inner) / 2, top: (size - inner) / 2 }, center]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.selGlow, { borderRadius: inner / 2 }, centerGlow]} />
          {/* Gradients don't cross <Svg> elements on native (they do on web): define it here too. */}
          <Svg width={inner} height={inner} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="okBody" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#C9D2FF" stopOpacity={0.36} />
                <Stop offset="1" stopColor="#6E3FB8" stopOpacity={0.28} />
              </LinearGradient>
            </Defs>
            <Circle cx={inner / 2} cy={inner / 2} r={inner / 2 - 1} fill="url(#okBody)" stroke="rgba(255,255,255,0.45)" strokeWidth={1.2} />
          </Svg>
          <Txt v="strong" style={{ fontSize: 16, letterSpacing: 0.2 }}>OK</Txt>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function DirGlow({ v, size, inner, angle, Icon }: {
  v: SharedValue<number>; size: number; inner: number; angle: number; Icon: typeof ChevronUp;
}) {
  const rad = (angle * Math.PI) / 180;
  const dist = (size / 2 + inner / 2) / 2 + 4;
  const cx = size / 2 + Math.cos(rad) * dist;
  const cy = size / 2 + Math.sin(rad) * dist;
  const g = size * 0.5;
  const glowStyle = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.7 + v.value * 0.3 }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * 0.18 }], opacity: 0.75 + v.value * 0.25 }));
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: cx - g / 2, top: cy - g / 2, width: g, height: g }, glowStyle]}>
        <Svg width={g} height={g}>
          <Defs>
            <RadialGradient id={`dg${angle}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.glow} stopOpacity={0.55} />
              <Stop offset="1" stopColor={C.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={g / 2} cy={g / 2} r={g / 2} fill={`url(#dg${angle})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: cx - 16, top: cy - 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, iconStyle]}>
        <Icon size={30} color={C.text} strokeWidth={2} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  selGlow: { backgroundColor: C.glow, shadowColor: C.glow, shadowOpacity: 0.9, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, opacity: 0 },
});
