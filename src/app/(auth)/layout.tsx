import type { ReactNode } from "react";

// Auth pages read the locale cookie for translations at the page level; opt
// this segment out of instant-shell validation (see next docs on `instant`).
export const instant = false;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-1 items-center justify-center bg-background px-4 py-10"
    >
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
