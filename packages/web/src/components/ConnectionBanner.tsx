import { ActivityMark } from "./ActivityMark.js";
import { StatusChip } from "./StatusChip.js";

interface Props {
  connected: boolean;
  serverId: string | null;
  error: string | null;
}

export function ConnectionBanner({ connected, serverId, error }: Props) {
  if (error !== null) {
    return (
      <header className="flex min-h-11 items-center justify-between border-b border-fold-border bg-fold-panel px-4 text-sm">
        <span className="flex items-center gap-2 font-mono text-fold-error">
          <span aria-hidden="true">✕</span>
          <span>Disconnected — {error}</span>
        </span>
        <StatusChip tone="error" label="Offline" />
      </header>
    );
  }
  if (!connected) {
    return (
      <header className="flex min-h-11 items-center justify-between border-b border-fold-border bg-fold-panel px-4 text-sm">
        <span className="flex items-center gap-2 font-mono text-fold-text-secondary">
          <ActivityMark state="working" label="Connecting" />
          <span>Connecting…</span>
        </span>
        <StatusChip tone="live" label="Connecting" />
      </header>
    );
  }
  return (
    <header className="flex min-h-11 items-center justify-between border-b border-fold-border bg-fold-panel px-4 text-sm">
      <span className="flex items-center gap-2 font-mono text-fold-text-secondary">
        <ActivityMark state="idle" label="Connected" />
        <span>Connected to {serverId ?? "unknown server"}</span>
      </span>
      <StatusChip tone="landed" label="Live" />
    </header>
  );
}
