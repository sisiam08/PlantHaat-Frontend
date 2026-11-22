/** One-sentence text alternative for a chart (also used as its aria label). */
export function ChartSummary({ text, className }: { text: string; className?: string }) {
  return (
    <p className={className ?? "text-xs leading-relaxed text-muted-foreground"}>{text}</p>
  );
}
