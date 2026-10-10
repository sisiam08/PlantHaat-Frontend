import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UsersList } from "@/features/admin/components/users-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("admin.users");
  const sp = await searchParams;
  const role = typeof sp.role === "string" ? sp.role : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <UsersList initialRole={role} initialStatus={status} initialPage={page} />
    </main>
  );
}
