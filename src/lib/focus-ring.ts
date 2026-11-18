/**
 * Shared card focus treatment: the visible indicator belongs to keyboard focus
 * only. `:focus-within` is deliberately not used because it also fires for
 * mouse/touch clicks, which left a green ring on the clicked card.
 *
 * Applied to the card wrapper. Only an anchor's `:focus-visible` lights it, so
 * a separately focused control inside the card (for example the wishlist
 * button) keeps its own single indicator instead of showing two.
 */
export const CARD_FOCUS_RING =
  "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-inset";

/** Applied to the card's anchor so only the wrapper ring is visible. */
export const CARD_LINK_FOCUS = "focus-visible:outline-none";

/** Single-anchor cards (category tiles) draw one inset ring on themselves. */
export const CARD_SELF_FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none";
