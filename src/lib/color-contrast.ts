export const DEFAULT_OVERLAY_TEXT = "#EFE7D2";
const NEUTRAL_IMAGE = "#777777";

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

export function blendHex(top: string, bottom: string, opacity: number): string {
  const alpha = Math.min(100, Math.max(0, opacity)) / 100;
  const a = hexToRgb(top);
  const b = hexToRgb(bottom);
  const mix = a.map((value, index) => Math.round(value * alpha + b[index] * (1 - alpha)));
  return `#${mix.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function overlayContrast(
  textColor: string | null | undefined,
  scrimColor: string | null | undefined,
  scrimOpacity: number,
): number {
  const text = isHexColor(textColor) ? textColor : DEFAULT_OVERLAY_TEXT;
  const scrim = isHexColor(scrimColor) ? scrimColor : "#0B2116";
  return contrastRatio(text, blendHex(scrim, NEUTRAL_IMAGE, scrimOpacity));
}

export function buttonContrast(
  textColor: string | null | undefined,
  backgroundColor: string | null | undefined,
): number | null {
  if (!isHexColor(textColor) || !isHexColor(backgroundColor)) return null;
  return contrastRatio(textColor, backgroundColor);
}
