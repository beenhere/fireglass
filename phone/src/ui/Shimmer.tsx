import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

/** Placeholder block with a band of light running across, like the TV's loading shelf. */
export function Shimmer({ style, radius = 14 }: { style?: StyleProp<ViewStyle>; radius?: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!reduced) x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [reduced, x]);
  const band = useAnimatedStyle(() => ({ left: `${-45 + x.value * 145}%` }));
  return (
    <View style={[{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { width: '45%' }, band]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.13)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
