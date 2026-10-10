import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

export interface AddressDistrict {
  id: number;
  name: string;
  nameBn: string;
  division: string;
}

export interface AddressView {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  districtId: number;
  district: AddressDistrict;
  area: string;
  addressLine: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  districtId: number;
  area: string;
  addressLine: string;
  postalCode?: string;
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
