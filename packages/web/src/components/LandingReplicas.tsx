interface ReplicaProps {
  headline: string;
  subcopy: string;
}

const SHELL = "bg-fold-bg text-fold-text";
const PANEL = "rounded-xl border border-fold-border bg-fold-panel";
const EYEBROW = "font-mono text-[11px] uppercase tracking-widest text-fold-muted";

interface DividerProps {
  label?: string;
}

/**
 * Fold page divider — hairline rule with optional mono label.
 * Use between replicas: <PageDivider /> renders ---,
 * <PageDivider label="L / R" /> renders --- L / R ---.
 */
export function PageDivider({ label }: DividerProps) {
  if (!label) {
    return <hr className="border-t border-fold-border" aria-hidden="true" />;
  }
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <hr className="flex-1 border-t border-fold-border" aria-hidden="true" />
      <span className="font-mono text-[11px] uppercase tracking-widest text-fold-subtle">
        {label}
      </span>
      <hr className="flex-1 border-t border-fold-border" aria-hidden="true" />
    </div>
  );
}

/**
 * Direct structural replicas of competitor landing heroes,
 * rebuilt with Fold tokens only. Intended as the source for
 * Explorations / Landing frames — one replica per frame.
 */
export function LinearReplica({ headline, subcopy }: ReplicaProps) {
  return (
    <section className={SHELL} aria-label="Linear replica">
      <p className={EYEBROW}>Fig L.1 — Linear: live issue as hero</p>
      <h1 className="text-4xl font-medium tracking-tight">{headline}</h1>
      <p className="text-fold-text-secondary">{subcopy}</p>
      <div className={PANEL}>
        <p className="font-mono text-xs text-fold-muted">SUP-2085 · Faster app launch</p>
        <p className="text-sm">Render UI before daemon sync, not after full refresh.</p>
        <p className="font-mono text-xs text-fold-subtle">
          Supaplane created the issue via Slack · Triage added labels · Agent opened draft PR
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-3 text-sm">
        <li className={PANEL}>Purpose-built</li>
        <li className={PANEL}>Powered by agents</li>
        <li className={PANEL}>Designed for speed</li>
      </ul>
    </section>
  );
}

export function RaycastReplica({ headline, subcopy }: ReplicaProps) {
  return (
    <section className={`${SHELL} text-center`} aria-label="Raycast replica">
      <p className={EYEBROW}>Fig R.1 — Raycast: launcher as hero</p>
      <h1 className="text-4xl font-medium tracking-tight">{headline}</h1>
      <p className="text-fold-text-secondary">{subcopy}</p>
      <div className={`${PANEL} mx-auto max-w-md font-mono text-sm`}>
        <p className="text-fold-muted">supaplane ›</p>
        <p>Fly Claude in worktree alpha…</p>
        <p>Land Codex session to main…</p>
      </div>
      <ul className="grid grid-cols-4 gap-3 text-xs text-fold-text-secondary">
        <li className={PANEL}>Desktop</li>
        <li className={PANEL}>Web</li>
        <li className={PANEL}>Mobile</li>
        <li className={PANEL}>CLI</li>
      </ul>
    </section>
  );
}

export function CursorReplica({ headline, subcopy }: ReplicaProps) {
  return (
    <section className={SHELL} aria-label="Cursor replica">
      <p className={EYEBROW}>Fig C.1 — Cursor: parallel agents + everywhere strip</p>
      <h1 className="text-4xl font-medium tracking-tight">{headline}</h1>
      <p className="text-fold-text-secondary">{subcopy}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className={PANEL}>
          <p className="font-mono text-xs text-fold-muted">Working · supaplane/api</p>
          <p className="text-sm">Add rate limits to public routes</p>
        </div>
        <div className={PANEL}>
          <p className="font-mono text-xs text-fold-muted">Working · supaplane/mobile</p>
          <p className="text-sm">Fix sign-in redirect on iOS</p>
        </div>
      </div>
      <p className="font-mono text-xs text-fold-subtle">Terminal · Slack · GitHub · IDE</p>
    </section>
  );
}

export function OpenCodeReplica({ headline, subcopy }: ReplicaProps) {
  return (
    <section className={SHELL} aria-label="OpenCode replica">
      <p className={EYEBROW}>Fig O.1 — OpenCode: terminal + install command</p>
      <h1 className="text-4xl font-medium tracking-tight">{headline}</h1>
      <p className="text-fold-text-secondary">{subcopy}</p>
      <div className={`${PANEL} font-mono text-sm`}>
        <p className="text-fold-muted">$ bunx supaplane</p>
        <p className="text-xs text-fold-subtle">Bring your own Claude / Codex / OpenCode. MIT. Local-first.</p>
      </div>
      <ul className="grid grid-cols-3 gap-3 text-xs">
        <li className={PANEL}>Any harness</li>
        <li className={PANEL}>Any surface</li>
        <li className={PANEL}>Private by default</li>
      </ul>
    </section>
  );
}
