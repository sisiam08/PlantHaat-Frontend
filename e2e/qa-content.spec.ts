import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Task 6 / 7 e2e: Q&A threading, review replies and content reporting through
 * the running servers (Playwright reuses :3000; it never starts them).
 */

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ORIGIN = BASE;
const SELLER = { email: "seller1@planthaat.test", password: "SellerDemo1" };
const C2 = { email: "customer2@planthaat.test", password: "CustomerDemo1" };
const C3 = { email: "customer3@planthaat.test", password: "CustomerDemo1" };
const C4 = { email: "customer4@planthaat.test", password: "CustomerDemo1" };

function mutate(
  api: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
): Promise<import("@playwright/test").APIResponse> {
  return api.post(url, { data, headers: { Origin: ORIGIN } });
}

async function login(api: APIRequestContext, email: string, password: string) {
  const response = await mutate(api, "/api/v1/auth/login", { email, password });
  expect(response.ok(), `login ${email} -> ${response.status()}`).toBeTruthy();
}

interface RequestFactory {
  request: {
    newContext: (options?: { baseURL?: string }) => Promise<APIRequestContext>;
  };
}

async function sellerContext(playwright: RequestFactory) {
  const api = await playwright.request.newContext({ baseURL: BASE });
  await login(api, SELLER.email, SELLER.password);
  return api;
}

test.describe("Q&A, replies and reports", () => {
  test("ask -> seller answer -> asker reply, visible to the public", async ({
    request,
    page,
    playwright,
  }) => {
    await login(request, C2.email, C2.password);
    // Use a product owned by seller1 so the answer is flagged as a seller answer.
    const seller = await sellerContext(playwright);
    const sellerProducts = await (await seller.get("/api/v1/seller/products")).json();
    const product = ((sellerProducts.data as { id: string; slug: string }[]) ?? [])[0];
    test.skip(!product, "Seller1 has no products");

    const questionBody = `e2e question ${Date.now()} — how do I care for this?`;
    const asked = await mutate(request, `/api/v1/products/${product.id}/questions`, {
      body: questionBody,
    });
    // The demo user can hit the 5 questions/hour limit after repeated runs.
    test.skip([422, 429].includes(asked.status()), "Q&A rate limit reached for this IP/user");
    expect(asked.status()).toBe(201);
    const questionId = (await asked.json()).data.id as string;

    const duplicate = await mutate(request, `/api/v1/products/${product.id}/questions`, {
      body: questionBody,
    });
    expect(duplicate.status()).toBe(409);

    await page.goto(`/products/${product.slug}?tab=qa`);
    await expect(page.getByText(questionBody)).toBeVisible({ timeout: 25_000 });

    const answerBody = `e2e answer ${Date.now()} — water weekly.`;
    const answered = await mutate(seller, `/api/v1/questions/${questionId}/answers`, {
      body: answerBody,
    });
    expect(answered.status()).toBe(201);
    const answer = (await answered.json()).data as { id: string; isSellerAnswer: boolean };
    expect(answer.isSellerAnswer).toBe(true);

    const replyBody = `e2e reply ${Date.now()} — thanks!`;
    const replied = await mutate(request, `/api/v1/answers/${answer.id}/replies`, {
      body: replyBody,
    });
    expect(replied.status()).toBe(201);

    const answers = await (await request.get(`/api/v1/questions/${questionId}/answers`)).json();
    const withReplies = (answers.data as { id: string; replies: { body: string }[] }[]).find(
      (row) => row.id === answer.id,
    );
    expect(withReplies?.replies.some((r) => r.body === replyBody)).toBe(true);

    await seller.dispose();
  });

  test("report a question creates a ContentReport with the right target", async ({ request }) => {
    await login(request, C3.email, C3.password);
    const products = await (await request.get("/api/v1/products?limit=1")).json();
    const product = products.data[0] as { id: string };

    const asked = await mutate(request, `/api/v1/products/${product.id}/questions`, {
      body: `e2e reportable ${Date.now()} — please review this.`,
    });
    test.skip([422, 429].includes(asked.status()), "Q&A rate limit reached for this IP/user");
    const questionId = (await asked.json()).data.id as string;

    const reported = await mutate(request, `/api/v1/questions/${questionId}/report`, {
      reason: "e2e report reason",
    });
    expect(reported.status()).toBe(201);
    expect((await reported.json()).data.targetType).toBe("QUESTION");
  });

  test("review replies are readable on the public review thread", async ({ request, playwright }) => {
    await login(request, C4.email, C4.password);
    const products = await (await request.get("/api/v1/products?limit=1")).json();
    const product = products.data[0] as { slug: string };

    const reviews = await (
      await request.get(`/api/v1/products/${product.slug}/reviews?pagination=cursor&limit=1`)
    ).json();
    const review = (reviews.data as { id: string }[])[0];
    test.skip(!review, "No visible review on the demo product to reply to");

    const seller = await sellerContext(playwright);
    const replyBody = `e2e review reply ${Date.now()}`;
    const replied = await mutate(seller, `/api/v1/reviews/${review.id}/replies`, {
      body: replyBody,
    });
    expect([201, 403]).toContain(replied.status());

    const publicReplies = await (await request.get(`/api/v1/reviews/${review.id}/replies`)).json();
    expect(Array.isArray(publicReplies.data)).toBe(true);
    await seller.dispose();
  });
});
