import type { BrandVariants, Theme } from '@fluentui/react-components';
import { createLightTheme } from '@fluentui/react-components';

/**
 * Brand colours (docs/DECISIONS.md D-009, D-010).
 * WORDMARK_GREEN is the "Env" in the logo on the dark title bar (contrast 4.7:1).
 * Interactive fills use brand80 = #237A45 so white 12–13 px text passes 4.5:1 (5.3:1).
 */
export const WORDMARK_GREEN = '#2F9E5B';
export const TITLE_BAR_BG = '#1E2125';

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const rgbToHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** 16-step ramp: 10 (darkest) → 80 (#237A45, primary fill) → 160 (lightest tint). */
function buildRamp(dark: string, mid: string, light: string): BrandVariants {
  const d = hexToRgb(dark);
  const m = hexToRgb(mid);
  const l = hexToRgb(light);
  const out: Record<number, string> = {};
  for (let step = 10; step <= 160; step += 10) {
    out[step] = step <= 80 ? rgbToHex(mix(d, m, (step - 10) / 70)) : rgbToHex(mix(m, l, (step - 80) / 80));
  }
  return out as unknown as BrandVariants;
}

export const brandRamp = buildRamp('#06160D', '#237A45', '#EEF7F1');

const base = createLightTheme(brandRamp);

export const envelopeTheme: Theme = {
  ...base,
  fontFamilyBase: '"Segoe UI", "Segoe UI Web (West European)", Inter, system-ui, -apple-system, sans-serif',
  fontSizeBase100: '10px',
  fontSizeBase200: '12px',
  fontSizeBase300: '13px',
  fontSizeBase400: '14px',
  lineHeightBase200: '16px',
  lineHeightBase300: '18px',
  borderRadiusSmall: '2px',
  borderRadiusMedium: '3px',
  borderRadiusLarge: '4px',
  borderRadiusXLarge: '4px',
};

/** Neutral greys used by shell chrome (panels are white with 1 px borders). */
export const shell = {
  border: '#E1E1E1',
  chrome: '#F5F5F5',
  chromeAlt: '#FAFAFA',
  textMuted: '#616161',
  textSubtle: '#8A8A8A',
  viewportBg: '#DADDE0',
} as const;
