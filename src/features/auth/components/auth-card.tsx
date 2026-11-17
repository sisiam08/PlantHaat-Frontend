import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="gap-1 text-center">
        <Link href="/" className="mx-auto mb-2 inline-flex min-h-11 items-center text-xl font-bold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          PlantHaat
        </Link>
        <h1 className="font-heading text-2xl font-bold">{title}</h1>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
