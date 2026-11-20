import type { Metadata } from "next";

import { SessionExpiredPage } from "@/features/auth/components/session-expired-page";

export const metadata: Metadata = {
  title: "Session expired",
  robots: { index: false, follow: false },
};

export default function SessionExpiredRoute() {
  return <SessionExpiredPage />;
}
