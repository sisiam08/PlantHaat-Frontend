"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The single password field: shadcn Input plus an accessible show/hide toggle.
 * Toggling only flips `type` between password and text; it never changes the
 * value, autocomplete hint or form state.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<typeof Input>, "type">
>(function PasswordInput({ className, id, ...props }, forwardedRef) {
  const t = useTranslations("auth");
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef<{ start: number | null; end: number | null } | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  // Changing `type` can move the caret to the end in some browsers; restore it
  // and keep focus in the field after the toggle re-renders.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const selection = selectionRef.current;
    if (!input || !selection) {
      return;
    }
    if (document.activeElement !== input) {
      input.focus({ preventScroll: true });
    }
    try {
      input.setSelectionRange(selection.start, selection.end);
    } catch {
      // Some input types do not expose a selection; the value is unaffected.
    }
    selectionRef.current = null;
  }, [visible]);

  const toggle = () => {
    const input = inputRef.current;
    if (input) {
      selectionRef.current = { start: input.selectionStart, end: input.selectionEnd };
    }
    setVisible((value) => !value);
  };

  return (
    <div className="relative">
      <Input
        {...props}
        ref={setRefs}
        id={inputId}
        type={visible ? "text" : "password"}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-controls={inputId}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        data-password-toggle
        onPointerDown={(event) => event.preventDefault()}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-foreground/80 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
});
