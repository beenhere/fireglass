/** Night sky palette and type, matched to the TV launcher (launcher/src/.../SkyView.java, Look.java). */
export const C = {
  base: '#070B1F',
  indigo: '#2E3A8C',
  plum: '#6E3FB8',
  teal: '#1B6F8A',
  text: '#FFFFFF',
  dim: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.5)',
  ghost: 'rgba(255,255,255,0.28)',
  hair: 'rgba(255,255,255,0.12)',
  fill: 'rgba(255,255,255,0.08)',
  fillHi: 'rgba(255,255,255,0.14)',
  glow: '#A9B8FF', // periwinkle, for focus and active things
  glowSoft: 'rgba(169,184,255,0.22)',
  live: '#7EE7C9', // connected / playing
  warn: '#FFC979',
  bad: '#FF8A9B',
  scrim: 'rgba(4,6,18,0.72)',
};

export const F = {
  serif: 'InstrumentSerif-Regular',
  regular: 'Figtree-Regular',
  medium: 'Figtree-Medium',
  semibold: 'Figtree-SemiBold',
  bold: 'Figtree-Bold',
};

export const R = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 };
export const S = { gutter: 20, gap: 12 };

export const fontAssets = {
  [F.serif]: require('../../assets/fonts/InstrumentSerif-Regular.ttf'),
  [F.regular]: require('../../assets/fonts/Figtree-Regular.ttf'),
  [F.medium]: require('../../assets/fonts/Figtree-Medium.ttf'),
  [F.semibold]: require('../../assets/fonts/Figtree-SemiBold.ttf'),
  [F.bold]: require('../../assets/fonts/Figtree-Bold.ttf'),
};

/** Springs used everywhere so motion feels like one family. */
export const SPRING = {
  press: { damping: 16, stiffness: 420, mass: 0.6 },
  settle: { damping: 18, stiffness: 180, mass: 0.9 },
  soft: { damping: 22, stiffness: 120, mass: 1 },
};

export function withAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
