import { Text, type TextProps, type TextStyle } from 'react-native';
import { C, F } from './theme';

const V = {
  display: { fontFamily: F.serif, fontSize: 36, lineHeight: 40, letterSpacing: -0.3 },
  title: { fontFamily: F.serif, fontSize: 28, lineHeight: 32, letterSpacing: -0.2 },
  serif: { fontFamily: F.serif, fontSize: 22, lineHeight: 26 },
  heading: { fontFamily: F.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21 },
  strong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: F.medium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export type TxtVariant = keyof typeof V;

export function Txt({ v = 'body', color = C.text, style, ...rest }: TextProps & { v?: TxtVariant; color?: string }) {
  return <Text {...rest} style={[V[v], { color }, style]} />;
}
