import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Hand } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import type { Key } from '@/lib/types';
import { Glass } from './Glass';
import { Txt } from './Txt';
import { C, R, SPRING } from './theme';

const STEP = 42; // px of travel per key press

/**
 * Swipe surface: every STEP of travel is one arrow press (with a haptic tick), tap selects,
 * long press is a long select. A soft light follows the finger.
 */
export function Touchpad({ width, height, onKey }: { width: number; height: number; onKey: (k: Key, long?: boolean) => void }) {
  const fx = useSharedValue(width / 2);
  const fy = useSharedValue(height / 2);
  const on = useSharedValue(0);
  const origin = useRef({ x: 0, y: 0 });
  const [hint, setHint] = useState(true);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .onBegin((e) => {
      fx.value = e.x; fy.value = e.y;
      on.value = withTiming(1, { duration: 120 });
      origin.current = { x: e.x, y: e.y };
      if (hint) setHint(false);
    })
    .onUpdate((e) => {
      fx.value = e.x; fy.value = e.y;
      const dx = e.x - origin.current.x, dy = e.y - origin.current.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < STEP) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      onKey(horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      haptic.tick();
      // keep the leftover so fast swipes don't lose presses
      origin.current = horizontal
        ? { x: origin.current.x + Math.sign(dx) * STEP, y: e.y }
        : { x: e.x, y: origin.current.y + Math.sign(dy) * STEP };
    })
    .onFinalize(() => { on.value = withTiming(0, { duration: 380 }); });

  const tap = Gesture.Tap().runOnJS(true).maxDuration(350).onEnd((_e, ok) => {
    if (!ok) return;
    haptic.press();
    onKey('select');
  }).onBegin((e) => {
    fx.value = e.x; fy.value = e.y;
    on.value = withSpring(1, SPRING.press);
  }).onFinalize(() => { on.value = withTiming(0, { duration: 300 }); });

  const long = Gesture.LongPress().runOnJS(true).minDuration(550).onStart(() => {
    haptic.ok();
    onKey('select', true);
  });

  const g = Gesture.Exclusive(pan, long, tap);
  const light = 180;
  const lightStyle = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ translateX: fx.value - light / 2 }, { translateY: fy.value - light / 2 }, { scale: 0.8 + on.value * 0.2 }],
  }));

  return (
    <GestureDetector gesture={g}>
      <View accessible accessibilityLabel="Touchpad. Swipe to move, tap to select." style={{ width, height }}>
        <Glass radius={R.xl} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <Animated.View style={[{ position: 'absolute', width: light, height: light }, lightStyle]} pointerEvents="none">
            <Svg width={light} height={light}>
              <Defs>
                <RadialGradient id="tp" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={C.glow} stopOpacity={0.6} />
                  <Stop offset="1" stopColor={C.glow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={light / 2} cy={light / 2} r={light / 2} fill="url(#tp)" />
            </Svg>
          </Animated.View>
          {hint ? (
            <View style={styles.hint} pointerEvents="none">
              <Hand size={26} color={C.faint} strokeWidth={1.6} />
              <Txt v="label" color={C.faint} style={{ textAlign: 'center' }}>Swipe to move{'\n'}Tap to select</Txt>
            </View>
          ) : null}
        </Glass>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hint: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10 },
});
