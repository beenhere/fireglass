import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { SPRING } from './theme';

const AP = Animated.createAnimatedComponent(Pressable);

/** Pressable that dips on touch with a spring, and taps the haptic engine. */
export function Press({
  children, style, scaleTo = 0.94, feedback = 'tap', onPressIn, onPressOut, ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; feedback?: 'tap' | 'press' | 'tick' | 'none';
}) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AP
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => {
        if (!reduced) s.value = withSpring(scaleTo, SPRING.press);
        if (feedback !== 'none' && !rest.disabled) haptic[feedback]();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, SPRING.settle);
        onPressOut?.(e);
      }}
    >
      {children}
    </AP>
  );
}
