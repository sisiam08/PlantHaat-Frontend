import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { clientEnv } from "@/env/client";
import { getPublicSettings } from "@/server/public-settings";
import { LocaleSwitch } from "./locale-switch";
import { Logo } from "./logo";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function whatsappHref(number: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("88") ? digits : `88${digits}`}`;
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
      </Link>
    </li>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const settings = await getPublicSettings();
  const phone = text(settings["support.phone"]) || clientEnv.NEXT_PUBLIC_SUPPORT_PHONE;
  const email = text(settings["support.email"]) || clientEnv.NEXT_PUBLIC_SUPPORT_EMAIL;
  const whatsapp = text(settings["support.whatsapp"]);

  return (
    <footer className="mt-16 border-t border-border/60 bg-gradient-to-b from-background to-secondary/40 pb-24 md:pb-0">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-5 [&>*]:min-w-0">
        <div className="grid content-start gap-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        <nav aria-label={t("company")} className="grid content-start gap-3">
          <h2 className="text-sm font-semibold text-foreground">{t("company")}</h2>
          <ul className="grid gap-2">
            <FooterLink href="/about" label={t("about")} />
            <FooterLink href="/how-it-works" label={t("howItWorks")} />
            <FooterLink href="/sell-with-us" label={t("sellWithUs")} />
            <FooterLink href="/contact" label={t("contact")} />
          </ul>
        </nav>

        <nav aria-label={t("policies")} className="grid content-start gap-3">
          <h2 className="text-sm font-semibold text-foreground">{t("policies")}</h2>
          <ul className="grid gap-2">
            <FooterLink href="/policies/terms" label={t("terms")} />
            <FooterLink href="/policies/privacy" label={t("privacy")} />
            <FooterLink
              href="/policies/refund-cancellation"
              label={t("refundCancellation")}
            />
            <FooterLink href="/policies/delivery" label={t("delivery")} />
          </ul>
        </nav>

        <div className="grid content-start gap-3">
          <h2 className="text-sm font-semibold text-foreground">{t("contact")}</h2>
          <ul className="grid min-w-0 gap-2 text-sm break-words text-muted-foreground">
            {phone ? (
              <li className="inline-flex min-w-0 items-center gap-2">
                <Phone aria-hidden className="size-4 text-primary" />
                <a
                  href={`tel:${phone}`}
                  className="break-all transition-colors hover:text-foreground"
                >
                  {phone}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="inline-flex min-w-0 items-center gap-2">
                <Mail aria-hidden className="size-4 text-primary" />
                <a
                  href={`mailto:${email}`}
                  className="break-all transition-colors hover:text-foreground"
                >
                  {email}
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li className="inline-flex min-w-0 items-center gap-2">
                <MessageCircle aria-hidden className="size-4 text-primary" />
                <a
                  href={whatsappHref(whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all transition-colors hover:text-foreground"
                >
                  {t("whatsapp")} · {whatsapp}
                </a>
              </li>
            ) : null}
          </ul>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t("needHelp")}</span> {t("helpHint")}
          </p>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © PlantHaat — {t("rights")}
          </p>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground">{t("preferences")}</span>
            <LocaleSwitch />
          </div>
        </div>
      </div>
    </footer>
  );
}


