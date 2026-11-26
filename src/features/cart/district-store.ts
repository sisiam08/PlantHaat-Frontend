const STORAGE_KEY = "planthaat.cart.districtId";

/**
 * The remembered delivery district for the cart/checkout summary. Guests get a
 * remembered choice too; logged-in users start from their default address when
 * nothing is remembered (the caller decides the fallback order).
 */
export function getRememberedDistrictId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function rememberDistrictId(districtId: number | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (districtId === null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, String(districtId));
  }
}


const THANA_KEY = "planthaat.cart.thanaId";

export function getRememberedThanaId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(THANA_KEY);
  return raw && raw.length > 0 ? raw : null;
}

export function rememberThanaId(thanaId: string | null): void {
  if (typeof window === "undefined") return;
  if (thanaId === null) window.localStorage.removeItem(THANA_KEY);
  else window.localStorage.setItem(THANA_KEY, thanaId);
}
