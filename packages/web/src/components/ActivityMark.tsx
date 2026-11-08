interface Props {
  state: "idle" | "working";
  size?: number;
  label?: string;
}

export const ACTIVITY_MARK_TOKENS = {
  cream: "var(--fold-passenger-cream)",
  navy: "var(--fold-passenger-navy)",
  ring: "var(--fold-fog)",
  moon: "var(--fold-accent)",
} as const;

/**
 * Small Fold activity mark. Idle is the drawn passenger egg (no arms, so it
 * stays legible at 16px). Eyes blink; working lets the face go and becomes
 * an orbit ring with an amber moon — the egg itself never spins.
 */
export function ActivityMark({ state, size = 16, label }: Props) {
  const title = label ?? (state === "working" ? "Working" : "Idle");
  if (state === "working") {
    const c = size / 2;
    const r = size * 0.31;
    const orbitR = size * 0.4;
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={title}
        className="shrink-0"
      >
        <circle cx={c} cy={c} r={r} fill={ACTIVITY_MARK_TOKENS.cream} />
        <circle
          cx={c}
          cy={c}
          r={orbitR}
          fill="none"
          stroke={ACTIVITY_MARK_TOKENS.ring}
          strokeWidth={Math.max(1, size * 0.06)}
          opacity={0.7}
        />
        <g className="fold-orbit-rotor">
          <circle
            cx={c + orbitR}
            cy={c}
            r={Math.max(1.5, size * 0.1)}
            fill={ACTIVITY_MARK_TOKENS.moon}
          />
        </g>
      </svg>
    );
  }
  const w = size * 0.78;
  const h = size * 0.94;
  const x = (size - w) / 2;
  const y = size - h;
  const eyeR = Math.max(1, size * 0.07);
  const eyeY = y + h * 0.32;
  const eyeGap = w * 0.22;
  const cx = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title}
      className="shrink-0"
    >
      <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={ACTIVITY_MARK_TOKENS.cream} />
      <circle
        className="fold-idle-blink"
        cx={cx - eyeGap}
        cy={eyeY}
        r={eyeR}
        fill={ACTIVITY_MARK_TOKENS.navy}
      />
      <circle
        className="fold-idle-blink"
        cx={cx + eyeGap}
        cy={eyeY}
        r={eyeR}
        fill={ACTIVITY_MARK_TOKENS.navy}
      />
      <path
        d={`M ${cx - eyeR * 1.2} ${eyeY + eyeR * 2.4} Q ${cx} ${eyeY + eyeR * 3.6} ${cx + eyeR * 1.2} ${eyeY + eyeR * 2.4}`}
        fill="none"
        stroke={ACTIVITY_MARK_TOKENS.navy}
        strokeWidth={Math.max(1, size * 0.06)}
        strokeLinecap="round"
      />
    </svg>
  );
}
