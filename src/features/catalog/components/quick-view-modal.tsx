"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

export function QuickViewModal({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[90vh] overflow-y-auto p-5 sm:max-w-3xl"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
