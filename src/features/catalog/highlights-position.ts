export type HighlightPosition =
  | "TOP_LEFT"
  | "TOP_CENTER"
  | "TOP_RIGHT"
  | "CENTER_LEFT"
  | "CENTER"
  | "CENTER_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_CENTER"
  | "BOTTOM_RIGHT";

export function splitPosition(position: string): { vertical: string; horizontal: string } {
  if (position === "CENTER") return { vertical: "center", horizontal: "center" };
  const [vertical = "BOTTOM", horizontal = "LEFT"] = position.split("_");
  return { vertical: vertical.toLowerCase(), horizontal: horizontal.toLowerCase() };
}

export function isHighlightPosition(value: string): value is HighlightPosition {
  return (
    value === "CENTER" ||
    /^(TOP|CENTER|BOTTOM)_(LEFT|CENTER|RIGHT)$/.test(value)
  );
}
