import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

export interface AddressThana {
  id: string;
  name: string;
  nameBn: string | null;
  dhakaZone: "CITY" | "SUBURBAN" | null;
}

export interface AddressDistrict {
  id: number;
  name: string;
  nameBn: string;
  division: string;
  metro: boolean;
  insideDhaka?: boolean;
  requiresThana?: boolean;
}

export interface AddressView {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  districtId: number;
  thanaId: string | null;
  thana: AddressThana | null;
  district: AddressDistrict;
  area: string;
  addressLine: string;
  postalCode: string | null;
  cityScope: "CITY" | "OUTSIDE" | "NA";
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  districtId: number;
  thanaId?: string;
  area: string;
  addressLine: string;
  postalCode?: string;
  cityScope?: "CITY" | "OUTSIDE" | "NA";
  isDefault?: boolean;
}

export const addressesApi = {
  list: () => apiGet<AddressView[]>("/addresses").then((result) => result.data),
  create: (input: CreateAddressInput) =>
    apiPost<AddressView>("/addresses", input).then((result) => result.data),
  update: (id: string, input: Partial<CreateAddressInput>) =>
    apiPatch<AddressView>(`/addresses/${encodeURIComponent(id)}`, input).then((result) => result.data),
  remove: (id: string) =>
    apiDelete<null>(`/addresses/${encodeURIComponent(id)}`).then(() => undefined),
  setDefault: (id: string) =>
    apiPost<AddressView>(`/addresses/${encodeURIComponent(id)}/default`).then((result) => result.data),
};
