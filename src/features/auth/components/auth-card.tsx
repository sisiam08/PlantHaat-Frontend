import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Link href="/" className="mx-auto mb-2 text-xl font-bold text-primary">
          PlantHaat
        </Link>
        <CardTitle className="text-2xl">{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
