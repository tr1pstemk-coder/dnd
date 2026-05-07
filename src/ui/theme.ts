export const Colors = {
  bg:          '#0F172A',
  surface:     '#1E293B',
  surfaceAlt:  '#263347',
  border:      '#334155',
  accent:      '#22C55E',
  accentDim:   '#16A34A',
  danger:      '#EF4444',
  warning:     '#F59E0B',
  info:        '#3B82F6',
  textPrimary: '#F1F5F9',
  textSecondary:'#94A3B8',
  textMuted:   '#64748B',
  gold:        '#EAB308',
  purple:      '#A855F7',
  cyan:        '#06B6D4',
};

export const Fonts = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 40,
};

export const Radius = {
  sm:  6,
  md:  12,
  lg:  16,
  xl:  24,
  full: 999,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const PROF_LABEL: Record<string, string> = {
  U: 'Н',
  T: 'И',
  E: 'Э',
  M: 'М',
  L: 'Л',
};

export const PROF_COLOR: Record<string, string> = {
  U: Colors.textMuted,
  T: Colors.info,
  E: Colors.accent,
  M: Colors.gold,
  L: Colors.purple,
};
