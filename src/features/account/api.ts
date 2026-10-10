import { apiPatch, apiPost } from "@/lib/api/client";
import type { PublicUser } from "@/lib/api/types";

export const accountApi = {
  updateProfile: (input: { name?: string; phone?: string }) =>
    apiPatch<PublicUser>("/users/me", input).then((result) => result.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost<{ changed: boolean }>("/auth/change-password", { currentPassword, newPassword }).then(
      (result) => result.data,
    ),
  updateNotificationPrefs: (prefs: Record<string, unknown>) =>
    apiPatch<PublicUser>("/users/me", { notificationPrefs: prefs }).then((result) => result.data),
};
