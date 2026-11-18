"use client";

import { useEffect } from "react";

/**
 * Tracks the last input modality on <html>. Card focus rings are gated on
 * `data-input-modality="keyboard"` in addition to `:focus-visible`, because
 * Chrome on Windows can match `:focus-visible` after a pointer click (focus
 * restoration, accessibility settings), which used to leave a green ring on
 * the clicked card. Pointer interaction always wins, so cards stay clean.
 */
export function InputModality() {
  useEffect(() => {
    const root = document.documentElement;
    // Presence of the attribute also signals that the listener is hydrated.
    if (!root.dataset.inputModality) {
      root.dataset.inputModality = "pointer";
    }
    const onKeyDown = () => {
      root.dataset.inputModality = "keyboard";
    };
    const onPointerDown = () => {
      root.dataset.inputModality = "pointer";
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return null;
}
