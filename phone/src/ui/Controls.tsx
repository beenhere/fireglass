import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { Glass } from './Glass';
import { Press } from './Press';
import { Txt } from './Txt';
import { C, R } from './theme';

/** Round glass button with an icon (back, home, menu…). */
export function RoundButton({
  icon: Icon, onPress, onLongPress, size = 52, label, iconSize, active, disabled, feedback = 'press',
}: {
  icon: LucideIcon; onPress?: () => void; onLongPress?: () => void; size?: number; label: string; iconSize?: number;
  active?: boolean; disabled?: boolean; feedback?: 'tap' | 'press' | 'tick';
}) {
  return (
    <Press onPress={onPress} onLongPress={onLongPress} disabled={disabled} feedback={feedback} accessibilityLabel={label}
      accessibilityRole="button" hitSlop={6} style={{ opacity: disabled ? 0.4 : 1 }}>
      <Glass radius={size / 2} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        tint={active ? 'rgba(169,184,255,0.28)' : undefined}>
        <Icon color={C.text} size={iconSize ?? Math.round(size * 0.38)} strokeWidth={1.9} />
      </Glass>
    </Press>
  );
}

/** Primary: a filled, softly glowing pill. Secondary: glass. */
export function Button({
  title, onPress, icon: Icon, kind = 'primary', busy, disabled, style, small,
}: {
  title: string; onPress?: () => void; icon?: LucideIcon; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean;
  disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const h = small ? 40 : 52;
  const fg = kind === 'primary' ? '#0B1030' : kind === 'danger' ? C.bad : C.text;
  const inner = (
    <View style={[styles.btnRow, { height: h, paddingHorizontal: small ? 16 : 22 }]}>
      {busy ? <ActivityIndicator color={fg} size="small" /> : Icon ? <Icon color={fg} size={small ? 16 : 19} strokeWidth={2.1} /> : null}
      <Txt v={small ? 'label' : 'strong'} color={fg}>{title}</Txt>
    </View>
  );
  return (
    <Press onPress={onPress} disabled={disabled || busy} scaleTo={0.96} feedback="press" accessibilityRole="button"
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      {kind === 'primary' ? (
        <View style={[styles.glowWrap, { borderRadius: h / 2 }]}>
          <LinearGradient colors={['#D6DDFF', '#A9B8FF', '#8E8CF2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: h / 2 }}>
            {inner}
          </LinearGradient>
        </View>
      ) : (
        <Glass radius={h / 2} tint={kind === 'danger' ? 'rgba(255,138,155,0.10)' : undefined}>{inner}</Glass>
      )}
    </Press>
  );
}

export function Chip({ title, onPress, icon: Icon, active }: { title: string; onPress?: () => void; icon?: LucideIcon; active?: boolean }) {
  return (
    <Press onPress={onPress} scaleTo={0.95} accessibilityRole="button">
      <Glass radius={R.pill} tint={active ? 'rgba(169,184,255,0.25)' : undefined}>
        <View style={styles.chip}>
          {Icon ? <Icon color={C.dim} size={15} strokeWidth={2} /> : null}
          <Txt v="label" color={C.text}>{title}</Txt>
        </View>
      </Glass>
    </Press>
  );
}

/** Two-option switch with a sliding filled pill. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void;
}) {
  return (
    <Glass radius={R.pill} style={{ padding: 4, flexDirection: 'row' }}>
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <Press key={o.value} onPress={() => onChange(o.value)} feedback="tick" scaleTo={0.96} style={{ flex: 1 }}
            accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={styles.seg}>
              {on ? <View style={styles.segOn} /> : null}
              {Icon ? <Icon color={on ? '#0B1030' : C.dim} size={15} strokeWidth={2.1} /> : null}
              <Txt v="label" color={on ? '#0B1030' : C.dim}>{o.label}</Txt>
            </View>
          </Press>
        );
      })}
    </Glass>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size * 2.2, height: size * 2.2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 2.2, height: size * 2.2, borderRadius: size * 1.1, backgroundColor: color, opacity: 0.22 }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt v="serif">{children}</Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  // Radii are half the height everywhere: Android doesn't clamp a 999 "pill" radius on Views.
  glowWrap: {
    shadowColor: '#A9B8FF', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, height: 38 },
  seg: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 36, paddingHorizontal: 12 },
  // Its own rounded layer behind the label, clipped, so Android can't square the corners.
  segOn: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: C.glow, borderRadius: 18, overflow: 'hidden' },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
});
