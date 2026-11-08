interface Props {
  label?: string;
}

/**
 * Three-dot thinking indicator. Opacity fade only — no shimmer sweep, no
 * spinning brand mark. Static dots under reduced motion.
 */
export function ThinkingDots({ label = "Thinking" }: Props) {
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label={label}>
      <span
        className="fold-thinking-dot size-1.5 rounded-full bg-fold-muted"
        style={{ animationDelay: "0ms" }}
        aria-hidden="true"
      />
      <span
        className="fold-thinking-dot size-1.5 rounded-full bg-fold-muted"
        style={{ animationDelay: "200ms" }}
        aria-hidden="true"
      />
      <span
        className="fold-thinking-dot size-1.5 rounded-full bg-fold-muted"
        style={{ animationDelay: "400ms" }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}…</span>
    </span>
  );
}
