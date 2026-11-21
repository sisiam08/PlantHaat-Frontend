import { apiPost } from "@/lib/api/client";

export type UploadPurpose =
  | "avatar"
  | "product"
  | "shop-logo"
  | "shop-banner"
  | "review"
  | "complaint"
  | "delivery-proof"
  | "payment"
  | "banner"
  | "category";

export interface StoredObject {
  key: string;
  url: string;
  width?: number;
  height?: number;
}

const UPLOAD_TIMEOUT_MS = 60_000;

/** Uploads go through the gateway as multipart; Axios sets the boundary and a longer timeout. */
export const uploadsApi = {
  image: (file: File, purpose: UploadPurpose) => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    return apiPost<StoredObject>("/uploads/images", form, { timeout: UPLOAD_TIMEOUT_MS }).then(
      (result) => result.data,
    );
  },
  document: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiPost<{ key: string }>("/uploads/documents", form, { timeout: UPLOAD_TIMEOUT_MS }).then(
      (result) => result.data,
    );
  },
};
