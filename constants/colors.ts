// SCS Checklist — field-form palette (mobile redesign)
// Flat, dense, high-contrast: grey ground, red chrome, green complete,
// orange open items, red not-started, blue reserved for "selected".

const Colors = {
  // Brand / chrome
  primary: '#CC0000',
  primaryDark: '#990000',
  primaryLight: '#FBEDED',
  accent: '#CC0000',
  tint: '#CC0000',
  chrome: '#2B2B2B',

  // Surfaces — the whole app sits on #D8D8D8
  background: '#D8D8D8',
  surface: '#D8D8D8',
  surfaceSecondary: '#CBCBCB',
  surfacePressed: '#CBCBCB',
  sectionBar: '#C2C2C2',
  subBar: '#CBCBCB',
  field: '#FFFFFF',

  // Ink — darkened for the grey ground (all >= 4.5:1 on #D8D8D8)
  text: '#111111',
  textSecondary: '#3A3A3A',
  textTertiary: '#5A5A5A',
  textMuted: '#5E5E5E',
  textOnDark: '#FFFFFF',

  // Rules
  border: '#B8B8B8',
  borderLight: '#C0C0C0',
  borderStrong: '#A8A8A8',

  // Status
  success: '#1E8E3E',
  successDark: '#16702F',
  successLight: '#DDEFE2',
  warning: '#F47B20',
  warningDark: '#8A4400',
  warningLight: '#FBE6D3',
  danger: '#CC2222',
  dangerBadge: '#E23A32',
  dangerBadgeBorder: '#B81C1C',
  dangerLight: '#FDF0F0',
  selected: '#0B84D6',

  shadow: 'transparent',
  cardShadow: 'transparent',
  tabIconDefault: 'rgba(255,255,255,0.6)',

  dark: {
    background: '#2B2B2B',
    surface: '#2B2B2B',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
  },
  light: {
    text: '#111111',
    background: '#D8D8D8',
    tint: '#CC0000',
    tabIconDefault: '#5A5A5A',
    tabIconSelected: '#CC0000',
  },
};

export default Colors;
