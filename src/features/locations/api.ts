import { apiGet } from "@/lib/api/client";

export interface ThanaView {
  id: string;
  name: string;
  nameBn: string | null;
  districtId: number;
  dhakaZone: "CITY" | "SUBURBAN" | null;
  selectableByCustomer: boolean;
}

/** Customers/sellers only see address-level, selectable thanas; duplicate names keep the first id. */
export function selectableThanas(thanas: ThanaView[]): ThanaView[] {
  const seen = new Set<string>();
  return thanas.filter((thana) => {
    if (thana.selectableByCustomer === false) return false;
    const key = thana.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const locationsApi = {
  thanas: (districtId: number) =>
    apiGet<ThanaView[]>("/locations/thanas", { params: { districtId } }).then(
      (result) => result.data,
    ),
};

