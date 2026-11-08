import type { ChipTone } from "./loading.js";

interface Props {
  tone: ChipTone;
  label: string;
}

const DOT_CLASS: Record<ChipTone, string> = {
  live: "bg-fold-live",
  landed: "bg-fold-success",
  error: "bg-fold-error",
  muted: "bg-fold-subtle",
};

/**
 * Fold status chip. Charcoal pill, coloured dot, short label. Posture and the
 * chip do the work — the plane itself is never recoloured.
 */
export function StatusChip({ tone, label }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-fold-elevated px-2 py-1 text-[11px] leading-none text-fold-text-secondary">
      <span
        className={`inline-block size-1.5 rounded-full ${DOT_CLASS[tone]}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
