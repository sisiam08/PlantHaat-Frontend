import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { SectionFallback } from "@/components/section-fallback";

const messages = {
  common: {
    sectionLoadFailed: "Couldn't load — try again",
    retry: "Try again",
  },
};

describe("SectionFallback", () => {
  it("shows the localized message and refreshes on retry", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SectionFallback />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Couldn't load — try again")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
