// Kleurtokens uit docs/STYLEGUIDE.md hoofdstuk 2, gelijk aan de CSS-variabelen in ../../src/index.css.
export const C = {
  blue: '#0a66ff',
  blueDark: '#0747b3',
  blueSoft: '#eef3ff',
  ink: '#12203a',
  muted: '#5d6b85',
  line: '#e3e8f0',
  surface: '#ffffff',
  canvas: '#f2f5fa',
  water: '#dfe9f5',
  starboard: '#0a8f5b',
  port: '#d33b3b',
  movable: '#e08a00',
  lock: '#8a2be2',
  track: '#ff5a1f',
  warnBg: '#fff4e0',
  warn: '#8a5300',
  errBg: '#ffe8e8',
  err: '#a02020',
  okBg: '#e3f7ea',
  ok: '#0a6b43',
  alt: '#7a8699',
  bridge: '#334',
  fav: '#ffd54a',
};

export const RADIUS = 16;

export const SHADOW = {
  shadowColor: '#0a1e46',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 12,
  elevation: 8,
};

export const T = {
  display: { fontSize: 28, lineHeight: 32, fontWeight: '700' as const },
  h1: { fontSize: 22, lineHeight: 26, fontWeight: '700' as const },
  h2: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  meta: { fontSize: 12, lineHeight: 16 },
  micro: { fontSize: 11, lineHeight: 14 },
};
