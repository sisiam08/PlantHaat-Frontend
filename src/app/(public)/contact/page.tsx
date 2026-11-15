import { Clock, Mail, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { StaticPage } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clientEnv } from "@/env/client";
import { getPublicSettings } from "@/server/public-settings";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.contact");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function ContactPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ContactContent />
    </Suspense>
  );
}

async function ContactContent() {
  const t = await getTranslations("static.contact");
  const settings = await getPublicSettings();
  const phone = text(settings["support.phone"]) || clientEnv.NEXT_PUBLIC_SUPPORT_PHONE;
  const email = text(settings["support.email"]) || clientEnv.NEXT_PUBLIC_SUPPORT_EMAIL;
  const whatsapp = text(settings["support.whatsapp"]);

  return (
    <StaticPage title={t("title")} lead={t("lead")}>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {phone ? (
          <Card className="rounded-2xl">
            <CardContent className="grid gap-2">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
                <Phone aria-hidden className="size-5" />
              </span>
              <span className="text-sm text-muted-foreground">{t("phoneLabel")}</span>
              <a href={`tel:${phone}`} className="font-medium hover:text-primary">
                {phone}
              </a>
            </CardContent>
          </Card>
        ) : null}

        {email ? (
          <Card className="rounded-2xl">
            <CardContent className="grid gap-2">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
                <Mail aria-hidden className="size-5" />
              </span>
              <span className="text-sm text-muted-foreground">{t("emailLabel")}</span>
              <a href={`mailto:${email}`} className="font-medium break-all hover:text-primary">
                {email}
              </a>
            </CardContent>
          </Card>
        ) : null}

        {whatsapp ? (
          <Card className="rounded-2xl">
            <CardContent className="grid gap-2">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
                <MessageCircle aria-hidden className="size-5" />
              </span>
              <span className="text-sm text-muted-foreground">{t("whatsappLabel")}</span>
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "").startsWith("88") ? whatsapp.replace(/\D/g, "") : `88${whatsapp.replace(/\D/g, "")}`}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium break-all hover:text-primary"
              >
                {whatsapp}
              </a>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl">
          <CardContent className="grid gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
              <Clock aria-hidden className="size-5" />
            </span>
            <span className="text-sm text-muted-foreground">{t("hoursLabel")}</span>
            <span className="font-medium">{t("hoursValue")}</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="grid gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
              <MapPin aria-hidden className="size-5" />
            </span>
            <span className="text-sm text-muted-foreground">{t("addressLabel")}</span>
            <span className="font-medium">{t("addressValue")}</span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 rounded-3xl border border-border/60 bg-secondary/30 px-6 py-10 md:px-12">
        <h2 className="font-heading text-2xl font-semibold">{t("helpTitle")}</h2>
        <p className="max-w-3xl text-muted-foreground">{t("helpBody")}</p>
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/60 bg-gradient-to-br from-cta/25 to-secondary/50 px-6 py-10 md:flex-row md:items-center md:px-12">
        <div className="grid gap-2">
          <h2 className="font-heading text-2xl font-semibold">{t("sellerSupportTitle")}</h2>
          <p className="max-w-xl text-muted-foreground">{t("sellerSupportBody")}</p>
        </div>
        <Button asChild variant="cta" size="lg">
          <Link href="/register/seller">
            <Store aria-hidden className="size-4" /> {t("sellerSupportCta")}
          </Link>
        </Button>
      </section>
    </StaticPage>
  );
}
