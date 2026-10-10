import type { Metadata } from "next";

import { SessionsList } from "@/features/auth/components/sessions-list";

export const metadata: Metadata = {
  title: "Sessions",
  robots: { index: false },
};

export default function SessionsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <SessionsList />
    </div>
  );
}
