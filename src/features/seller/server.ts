import "server-only";

import { serverGet } from "@/server/backend";
import { readAuthCookies } from "@/server/cookies";
import { resolveDashboardRange } from "@/server/dashboard-range";
import type { DateRange } from "@/components/dashboard/range";
import type {
  SellerPanels,
  SellerProductListItem,
  SellerShopOrderView,
  SellerWallet,
} from "./types";

async function token(): Promise<string | undefined> {
  return (await readAuthCookies()).accessToken;
}

/** Server first paint for the seller dashboard/health strips; falls back to the client query. */
export async function getSellerPanelsServer(
  range?: DateRange,
): Promise<SellerPanels | undefined> {
  const resolved = range ?? (await resolveDashboardRange("30d"));
  const accessToken = await token();
  if (!accessToken) return undefined;
  const params = new URLSearchParams({ from: resolved.from, to: resolved.to });
  try {
    const result = await serverGet<SellerPanels>(`/seller/analytics/panels?${params.toString()}`, {
      token: accessToken,
    });
    return result.data;
  } catch {
    return undefined;
  }
}

export async function getSellerOrdersServer(params: {
  status?: string;
  page: number;
  limit: number;
}): Promise<{ data: SellerShopOrderView[]; meta?: unknown } | undefined> {
  const accessToken = await token();
  if (!accessToken) return undefined;
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  try {
    const result = await serverGet<SellerShopOrderView[]>(`/seller/orders?${query.toString()}`, {
      token: accessToken,
    });
    return { data: result.data, meta: result.meta };
  } catch {
    return undefined;
  }
}

export async function getSellerWalletServer(): Promise<SellerWallet | undefined> {
  const accessToken = await token();
  if (!accessToken) return undefined;
  try {
    const result = await serverGet<SellerWallet>("/seller/wallet", { token: accessToken });
    return result.data;
  } catch {
    return undefined;
  }
}

export async function getSellerProductsServer(): Promise<SellerProductListItem[] | undefined> {
  const accessToken = await token();
  if (!accessToken) return undefined;
  try {
    const result = await serverGet<SellerProductListItem[]>("/seller/products", {
      token: accessToken,
    });
    return result.data;
  } catch {
    return undefined;
  }
}
