import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import { cookies } from "next/headers";

import bn from "@/messages/bn.json";
import en from "@/messages/en.json";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export type OgLocale = "bn" | "en";

const FONT_DIR = join(process.cwd(), "public", "fonts");

const [bnRegular, bnBold, latinRegular, latinBold] = await Promise.all([
  readFile(join(FONT_DIR, "hind-siliguri-bengali-400.ttf")),
  readFile(join(FONT_DIR, "hind-siliguri-bengali-700.ttf")),
  readFile(join(FONT_DIR, "hind-siliguri-latin-400.ttf")),
  readFile(join(FONT_DIR, "hind-siliguri-latin-700.ttf")),
]);

export function ogFonts() {
  return [
    { name: "Hind", data: bnRegular, style: "normal" as const, weight: 400 as const },
    { name: "Hind", data: bnBold, style: "normal" as const, weight: 700 as const },
    { name: "Hind", data: latinRegular, style: "normal" as const, weight: 400 as const },
    { name: "Hind", data: latinBold, style: "normal" as const, weight: 700 as const },
  ];
}

export async function getOgLocale(): Promise<OgLocale> {
  const store = await cookies();
  return store.get("NEXT_LOCALE")?.value === "en" ? "en" : "bn";
}

export function ogMessages(locale: OgLocale) {
  return locale === "en" ? en : bn;
}

interface BrandOgImageProps {
  title: string;
  subtitle?: string;
  price?: string;
}

export function BrandOgImage({ title, subtitle, price }: BrandOgImageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "72px",
        background: "linear-gradient(135deg, #0F2A1D 0%, #375534 100%)",
        fontFamily: "Hind",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "60px",
            height: "60px",
            borderRadius: "18px",
            background: "#F2A93B",
            color: "#0F2A1D",
            fontSize: "38px",
            fontWeight: 700,
          }}
        >
          P
        </div>
        <div style={{ display: "flex", color: "#E3EED4", fontSize: "36px", fontWeight: 700 }}>
          PlantHaat
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        <div
          style={{
            display: "flex",
            color: "#FFFFFF",
            fontSize: "74px",
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: "1000px",
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              color: "#AEC3B0",
              fontSize: "32px",
              lineHeight: 1.4,
              maxWidth: "940px",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {price ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#F2A93B",
              color: "#0F2A1D",
              fontSize: "42px",
              fontWeight: 700,
              padding: "14px 36px",
              borderRadius: "999px",
            }}
          >
            {price}
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
        <div style={{ display: "flex", color: "#AEC3B0", fontSize: "28px" }}>
          planthaat.com
        </div>
      </div>
    </div>
  );
}

export function renderBrandImage(props: BrandOgImageProps) {
  return new ImageResponse(<BrandOgImage {...props} />, {
    ...ogSize,
    fonts: ogFonts(),
  });
}
