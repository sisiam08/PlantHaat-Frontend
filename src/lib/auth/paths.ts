/**
 * Routes that need a signed-in user. Kept in one place so the client dialog and
 * the proxy agree on when a session end should be a dialog (dead session) rather
 * than a quiet logged-out state.
 */
const PROTECTED_PREFIXES = [
  "/checkout",
  "/orders",
  "/account",
  "/wishlist",
  "/notifications",
  "/complaints",
  "/seller",
  "/admin",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
