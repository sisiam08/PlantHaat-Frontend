import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UserDetail } from "@/features/admin/components/user-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return { title: t("detailTitle"), robots: { index: false } };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <UserDetail id={id} />
    </main>
  );
}
