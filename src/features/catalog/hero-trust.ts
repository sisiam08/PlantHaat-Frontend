/**
 * The three-item trust row under the hero. Pure so the COD gate and the
 * setting-driven complaint window can be unit-tested without a server render.
 * `payment.cod.enabled` and `return.windowHours` are the only sources; no
 * business value is hard-coded here.
 */
export type HeroTrustKey = "trustPay" | "trustVerified" | "trustProblem";

export interface HeroTrustItem {
  key: HeroTrustKey;
  hours?: number;
}

export function heroTrustItems(input: { codEnabled: boolean; windowHours: number }): HeroTrustItem[] {
  const items: HeroTrustItem[] = [];
  if (input.codEnabled) items.push({ key: "trustPay" });
  items.push({ key: "trustVerified" });
  if (Number.isFinite(input.windowHours) && input.windowHours > 0) {
    items.push({ key: "trustProblem", hours: input.windowHours });
  }
  return items;
}

export function readHeroTrust(settings: Record<string, unknown>): HeroTrustItem[] {
  return heroTrustItems({
    codEnabled: settings["payment.cod.enabled"] === true,
    windowHours: Number(settings["return.windowHours"]),
  });
}
