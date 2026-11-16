import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/common";
import type {
  AdminAnalyticsOverview,
  AdminAnnouncement,
  AdminAuditLog,
  AdminBanner,
  AdminCategory,
  AdminCommissionRule,
  AdminHomepageSection,
  AdminPaymentListItem,
  AdminPayoutView,
  AdminProductListItem,
  AdminRefundView,
  AdminSellerDetail,
  AdminSellerListItem,
  AdminSettingDefinition,
  AdminSettingHistory,
  AdminSettings,
  AdminShopListItem,
  AdminShopOrderView,
  AdminStuckOrder,
  AdminUserDetail,
  AdminUserListItem,
  AdminComplaintView,
  AdminReviewReportView,
  AnnouncementInput,
  BannerInput,
  BulkCancelResult,
  CategoryInput,
  CodRiskProfile,
  CreateCommissionRuleInput,
  CreatePayoutInput,
  DuesAdjustmentResult,
  HomepageSectionInput,
  LedgerEntryView,
  ReconciliationResult,
  SuspendedSellerOpenOrders,
  TransitionOrderInput,
  UpdateCommissionRuleInput,
  UpdatePayoutInput,
} from "./types";

function paginated<T>(result: { data: T[]; meta?: PaginationMeta }) {
  return { data: result.data, meta: result.meta };
}

function qs(params?: Record<string, string | number | boolean | undefined>) {
  return params ? { params } : undefined;
}

export const adminApi = {
  /* ───────────────────────── analytics ───────────────────────── */
  analytics: (params?: { from?: string; to?: string }) =>
    apiGet<AdminAnalyticsOverview>("/admin/analytics/overview", qs(params)).then(
      (result) => result.data,
    ),

  /* ───────────────────────── sellers ───────────────────────── */
  listSellers: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminSellerListItem[]>("/admin/sellers", qs(params)).then((result) => paginated(result)),
  getSeller: (id: string) =>
    apiGet<AdminSellerDetail>(`/admin/sellers/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),
  approveSeller: (id: string) =>
    apiPost<AdminSellerDetail>(`/admin/sellers/${encodeURIComponent(id)}/approve`).then(
      (result) => result.data,
    ),
  rejectSeller: (id: string, reason: string) =>
    apiPost<AdminSellerDetail>(`/admin/sellers/${encodeURIComponent(id)}/reject`, {
      reason,
    }).then((result) => result.data),
  suspendSeller: (
    id: string,
    input: { reason?: string; cancelOpenOrders?: boolean; cancelReason?: string },
  ) =>
    apiPost<AdminSellerDetail>(`/admin/sellers/${encodeURIComponent(id)}/suspend`, input).then(
      (result) => result.data,
    ),
  bulkCancelSellerOrders: (id: string, input: { reason: string; restock?: boolean }) =>
    apiPost<BulkCancelResult>(
      `/admin/sellers/${encodeURIComponent(id)}/bulk-cancel-orders`,
      input,
    ).then((result) => result.data),
  listSuspendedOpenOrders: () =>
    apiGet<SuspendedSellerOpenOrders[]>("/admin/suspended-sellers/open-orders").then(
      (result) => result.data,
    ),
  listStuckOrders: (params?: { page?: number; limit?: number; includeOverdue?: boolean }) =>
    apiGet<AdminStuckOrder[]>("/admin/stuck-orders", qs(params)).then((result) =>
      paginated(result),
    ),
  reactivateSeller: (id: string) =>
    apiPost<AdminSellerDetail>(`/admin/sellers/${encodeURIComponent(id)}/reactivate`).then(
      (result) => result.data,
    ),
  listSellerLedger: (id: string, params?: { type?: string; page?: number; limit?: number }) =>
    apiGet<LedgerEntryView[]>(`/admin/sellers/${encodeURIComponent(id)}/ledger`, qs(params)).then(
      (result) => paginated(result),
    ),
  recordDuesPayment: (
    id: string,
    input: { amount: number; method?: string; reference?: string; note?: string },
  ) =>
    apiPost<DuesAdjustmentResult>(
      `/admin/sellers/${encodeURIComponent(id)}/dues-payments`,
      input,
    ).then((result) => result.data),
  recordAdjustment: (id: string, input: { amount: number; note: string }) =>
    apiPost<DuesAdjustmentResult>(
      `/admin/sellers/${encodeURIComponent(id)}/adjustments`,
      input,
    ).then((result) => result.data),

  /* ───────────────────────── users ───────────────────────── */
  listUsers: (params?: { role?: string; status?: string; page?: number; limit?: number }) =>
    apiGet<AdminUserListItem[]>("/admin/users", qs(params)).then((result) => paginated(result)),
  getUser: (id: string) =>
    apiGet<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`).then((result) => result.data),
  createAdminUser: (input: { email: string; password: string; name: string }) =>
    apiPost<AdminUserListItem>("/admin/users", input).then((result) => result.data),
  suspendUser: (id: string) =>
    apiPost<{ id: string; status: string }>(`/admin/users/${encodeURIComponent(id)}/suspend`).then(
      (result) => result.data,
    ),
  reactivateUser: (id: string) =>
    apiPost<{ id: string; status: string }>(
      `/admin/users/${encodeURIComponent(id)}/reactivate`,
    ).then((result) => result.data),

  /* ───────────────────────── shops ───────────────────────── */
  listShops: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminShopListItem[]>("/admin/shops", qs(params)).then((result) => paginated(result)),
  suspendShop: (id: string, reason?: string) =>
    apiPost<{ suspended: boolean }>(`/admin/shops/${encodeURIComponent(id)}/suspend`, {
      reason,
    }).then((result) => result.data),
  reactivateShop: (id: string) =>
    apiPost<{ reactivated: boolean }>(`/admin/shops/${encodeURIComponent(id)}/reactivate`).then(
      (result) => result.data,
    ),

  /* ───────────────────────── products ───────────────────────── */
  listProducts: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminProductListItem[]>("/admin/products", qs(params)).then((result) =>
      paginated(result),
    ),
  approveProduct: (id: string) =>
    apiPost<{ id: string; status: string }>(
      `/admin/products/${encodeURIComponent(id)}/approve`,
    ).then((result) => result.data),
  rejectProduct: (id: string, reason: string) =>
    apiPost<{ id: string; status: string }>(`/admin/products/${encodeURIComponent(id)}/reject`, {
      reason,
    }).then((result) => result.data),
  removeProduct: (id: string, reason: string) =>
    apiPost<{ id: string; status: string }>(`/admin/products/${encodeURIComponent(id)}/remove`, {
      reason,
    }).then((result) => result.data),

  /* ───────────────────────── categories ───────────────────────── */
  listCategories: () => apiGet<AdminCategory[]>("/admin/categories").then((result) => result.data),
  createCategory: (input: CategoryInput) =>
    apiPost<AdminCategory>("/admin/categories", input).then((result) => result.data),
  updateCategory: (id: string, input: Partial<CategoryInput>) =>
    apiPatch<AdminCategory>(`/admin/categories/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  removeCategory: (id: string) =>
    apiDelete<unknown>(`/admin/categories/${encodeURIComponent(id)}`).then(() => undefined),

  /* ───────────────────────── orders ───────────────────────── */
  listOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminShopOrderView[]>("/admin/orders", qs(params)).then((result) => paginated(result)),
  getOrder: (id: string) =>
    apiGet<AdminShopOrderView>(`/admin/orders/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),
  transitionOrder: (id: string, input: TransitionOrderInput) =>
    apiPost<AdminShopOrderView>(`/admin/orders/${encodeURIComponent(id)}/status`, input).then(
      (result) => result.data,
    ),
  respondCancellation: (id: string, input: { approve: boolean; note?: string }) =>
    apiPost<{ handled: boolean; approved: boolean }>(
      `/admin/cancellation-requests/${encodeURIComponent(id)}/respond`,
      input,
    ).then((result) => result.data),

  /* ───────────────────────── payments ───────────────────────── */
  listPayments: (params?: {
    status?: string;
    method?: string;
    order?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    apiGet<AdminPaymentListItem[]>("/admin/payments", qs(params)).then((result) =>
      paginated(result),
    ),
  getPayment: (id: string) =>
    apiGet<AdminPaymentListItem>(`/admin/payments/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),

  /* ───────────────────────── refunds ───────────────────────── */
  listRefunds: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminRefundView[]>("/admin/refunds", qs(params)).then((result) => paginated(result)),
  approveRefund: (id: string) =>
    apiPost<AdminRefundView>(`/admin/refunds/${encodeURIComponent(id)}/approve`).then(
      (result) => result.data,
    ),
  rejectRefund: (id: string, note?: string) =>
    apiPost<AdminRefundView>(`/admin/refunds/${encodeURIComponent(id)}/reject`, { note }).then(
      (result) => result.data,
    ),
  processRefund: (id: string, input: { method?: string; reference?: string; note?: string }) =>
    apiPost<{ processed: boolean }>(`/admin/refunds/${encodeURIComponent(id)}/process`, input).then(
      (result) => result.data,
    ),

  /* ───────────────────────── payouts & commission ───────────────────────── */
  listPayouts: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminPayoutView[]>("/admin/payouts", qs(params)).then((result) => paginated(result)),
  createPayout: (input: CreatePayoutInput) =>
    apiPost<AdminPayoutView>("/admin/payouts", input).then((result) => result.data),
  updatePayout: (id: string, input: UpdatePayoutInput) =>
    apiPatch<AdminPayoutView>(`/admin/payouts/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  listCommissionRules: (params?: {
    scope?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) =>
    apiGet<AdminCommissionRule[]>("/admin/commission-rules", qs(params)).then((result) =>
      paginated(result),
    ),
  createCommissionRule: (input: CreateCommissionRuleInput) =>
    apiPost<AdminCommissionRule>("/admin/commission-rules", input).then((result) => result.data),
  updateCommissionRule: (id: string, input: UpdateCommissionRuleInput) =>
    apiPatch<AdminCommissionRule>(`/admin/commission-rules/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  removeCommissionRule: (id: string) =>
    apiDelete<unknown>(`/admin/commission-rules/${encodeURIComponent(id)}`).then(() => undefined),

  /* ───────────────────────── complaints ───────────────────────── */
  listComplaints: (params?: { status?: string; page?: number; limit?: number }) =>
    apiGet<AdminComplaintView[]>("/admin/complaints", qs(params)).then((result) =>
      paginated(result),
    ),
  getComplaint: (id: string) =>
    apiGet<AdminComplaintView>(`/admin/complaints/${encodeURIComponent(id)}`).then(
      (result) => result.data,
    ),
  updateComplaintStatus: (id: string, input: { status: string; resolutionNote?: string }) =>
    apiPost<AdminComplaintView>(`/admin/complaints/${encodeURIComponent(id)}/status`, input).then(
      (result) => result.data,
    ),
  resolveComplaint: (
    id: string,
    input: { status: string; resolutionNote?: string; refundAmount?: number },
  ) =>
    apiPost<AdminComplaintView>(`/admin/complaints/${encodeURIComponent(id)}/resolve`, input).then(
      (result) => result.data,
    ),
  commentComplaint: (id: string, input: { body: string; isInternal?: boolean }) =>
    apiPost<{ id: string }>(`/admin/complaints/${encodeURIComponent(id)}/comment`, input).then(
      (result) => result.data,
    ),

  /* ───────────────────────── reviews ───────────────────────── */
  listReviewReports: (params?: { page?: number; limit?: number }) =>
    apiGet<AdminReviewReportView[]>("/admin/review-reports", qs(params)).then((result) =>
      paginated(result),
    ),
  resolveReviewReport: (id: string, hide: boolean) =>
    apiPost<{ resolved: boolean; hidden: boolean }>(
      `/admin/review-reports/${encodeURIComponent(id)}/resolve`,
      { hide },
    ).then((result) => result.data),
  hideReview: (id: string) =>
    apiPost<{ id: string; status: string }>(`/admin/reviews/${encodeURIComponent(id)}/hide`).then(
      (result) => result.data,
    ),
  unhideReview: (id: string) =>
    apiPost<{ id: string; status: string }>(`/admin/reviews/${encodeURIComponent(id)}/unhide`).then(
      (result) => result.data,
    ),

  /* ───────────────────────── content ───────────────────────── */
  listBanners: () => apiGet<AdminBanner[]>("/admin/banners").then((result) => result.data),
  createBanner: (input: BannerInput) =>
    apiPost<AdminBanner>("/admin/banners", input).then((result) => result.data),
  updateBanner: (id: string, input: Partial<BannerInput>) =>
    apiPatch<AdminBanner>(`/admin/banners/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  removeBanner: (id: string) =>
    apiDelete<unknown>(`/admin/banners/${encodeURIComponent(id)}`).then(() => undefined),

  listHomepageSections: () =>
    apiGet<AdminHomepageSection[]>("/admin/homepage-sections").then((result) => result.data),
  createHomepageSection: (input: HomepageSectionInput) =>
    apiPost<AdminHomepageSection>("/admin/homepage-sections", input).then((result) => result.data),
  updateHomepageSection: (id: string, input: Partial<HomepageSectionInput>) =>
    apiPatch<AdminHomepageSection>(
      `/admin/homepage-sections/${encodeURIComponent(id)}`,
      input,
    ).then((result) => result.data),
  removeHomepageSection: (id: string) =>
    apiDelete<unknown>(`/admin/homepage-sections/${encodeURIComponent(id)}`).then(() => undefined),

  listAnnouncements: (params?: { page?: number; limit?: number }) =>
    apiGet<AdminAnnouncement[]>("/admin/announcements", qs(params)).then((result) =>
      paginated(result),
    ),
  createAnnouncement: (input: AnnouncementInput) =>
    apiPost<AdminAnnouncement>("/admin/announcements", input).then((result) => result.data),
  updateAnnouncement: (id: string, input: Partial<AnnouncementInput>) =>
    apiPatch<AdminAnnouncement>(`/admin/announcements/${encodeURIComponent(id)}`, input).then(
      (result) => result.data,
    ),
  removeAnnouncement: (id: string) =>
    apiDelete<unknown>(`/admin/announcements/${encodeURIComponent(id)}`).then(() => undefined),

  /* ───────────────────────── audit & settings ───────────────────────── */
  listAuditLogs: (params?: {
    entityType?: string;
    action?: string;
    actorId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiGet<AdminAuditLog[]>("/admin/audit-logs", qs(params)).then((result) => paginated(result)),
  getSettings: () => apiGet<AdminSettings>("/admin/settings").then((result) => result.data),
  getSettingsRegistry: () =>
    apiGet<AdminSettingDefinition[]>("/admin/settings/registry").then((result) => result.data),
  getSettingsHistory: (key?: string) =>
    apiGet<AdminSettingHistory[]>("/admin/settings/history", qs({ key })).then(
      (result) => result.data,
    ),
  reauthenticateSettings: (keys: string[], password: string) =>
    apiPost<{ token: string; expiresAt: string }>("/admin/settings/reauth", { keys, password }).then(
      (result) => result.data,
    ),
  updateSettings: (values: AdminSettings, reauthToken?: string) =>
    apiPatch<AdminSettings>(
      "/admin/settings",
      { values },
      reauthToken ? { headers: { "x-settings-reauth": reauthToken } } : undefined,
    ).then((result) => result.data),
  listCodRisk: (params?: { status?: string; q?: string; page?: number; limit?: number }) =>
    apiGet<CodRiskProfile[]>("/admin/cod-risk", qs(params)).then((result) => paginated(result)),
  setCodRiskStatus: (id: string, input: { status: string; note?: string }) =>
    apiPost<CodRiskProfile>("/admin/cod-risk/${encodeURIComponent(id)}/status", input).then(
      (result) => result.data,
    ),
  setCodRiskWhitelist: (id: string, input: { whitelisted: boolean; note?: string }) =>
    apiPost<CodRiskProfile>("/admin/cod-risk/${encodeURIComponent(id)}/whitelist", input).then(
      (result) => result.data,
    ),
  reconciliation: (params?: { from?: string; to?: string }) =>
    apiGet<ReconciliationResult>("/admin/reconciliation", qs(params)).then((result) => result.data),
};

/**
 * Seller documents are streamed from an authenticated endpoint. We fetch the
 * bytes through the same-origin gateway (cookies are sent automatically) and
 * render them from a blob URL so raw storage paths are never exposed.
 */
export async function fetchAdminSellerDocument(
  sellerId: string,
  documentId: string,
): Promise<{ blob: Blob; contentType: string }> {
  const response = await fetch(
    `/api/v1/admin/sellers/${encodeURIComponent(sellerId)}/documents/${encodeURIComponent(documentId)}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(`DOCUMENT_${response.status}`);
  }
  const blob = await response.blob();
  return { blob, contentType: response.headers.get("content-type") ?? blob.type };
}
