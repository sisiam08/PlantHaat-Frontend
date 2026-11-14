"use client";

import { useEffect } from "react";

/**
 * The static shell renders `<html lang="bn">` (the default locale). Once the
 * cookie locale resolves on the client, mirror it onto the document so screen
 * readers and search engines see the real language of the rendered content.
 */
export function LocaleLang({ locale }: { locale: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);
  return null;
}
