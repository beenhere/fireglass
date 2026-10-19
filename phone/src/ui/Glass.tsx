import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { R } from './theme';

let seq = 0;

/**
 * Frosted glass like the TV shelf: a translucent white body lit from the top and a hairline rim
 * that is bright along the top edge and fades down the sides.
 */
export function Glass({
  children, style, radius = R.lg, strength = 1, tint, rim = true,
}: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; strength?: number; tint?: string; rim?: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [id] = useState(() => `glass${++seq}`);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
  };
  const s = strength;
  // SVG clamps rx and ry separately, which turns a big radius into an ellipse; clamp to a true pill.
  const r = size ? Math.min(radius, size.h / 2, size.w / 2) : radius;
  return (
    <View style={[{ borderRadius: radius }, style]} onLayout={onLayout}>
      {size ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h} pointerEvents="none">
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.17 * s} />
              <Stop offset="0.55" stopColor="#fff" stopOpacity={0.07 * s} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0.1 * s} />
            </LinearGradient>
            <LinearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.5} />
              <Stop offset="0.5" stopColor="#fff" stopOpacity={0.08} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0.16} />
            </LinearGradient>
          </Defs>
          <Rect x={0.75} y={0.75} width={size.w - 1.5} height={size.h - 1.5} rx={r} ry={r} fill={`url(#${id}b)`} />
          {tint ? <Rect x={0.75} y={0.75} width={size.w - 1.5} height={size.h - 1.5} rx={r} ry={r} fill={tint} /> : null}
          {rim ? (
            <Rect x={0.75} y={0.75} width={size.w - 1.5} height={size.h - 1.5} rx={r} ry={r}
              fill="none" stroke={`url(#${id}r)`} strokeWidth={1.25} />
          ) : null}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
