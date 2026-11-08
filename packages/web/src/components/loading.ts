import type { SessionStatus, WorkspaceState } from "@echohello/protocol";

export type ChipTone = "live" | "landed" | "error" | "muted";

export interface ChipSpec {
  readonly tone: ChipTone;
  readonly label: string;
}

const SESSION_CHIP_TONE: Record<SessionStatus, ChipTone> = {
  idle: "muted",
  running: "live",
  waiting: "live",
  paused: "muted",
  error: "error",
  done: "landed",
};

const SESSION_CHIP_LABEL: Record<SessionStatus, string> = {
  idle: "Idle",
  running: "Working",
  waiting: "Waiting",
  paused: "Paused",
  error: "Error",
  done: "Done",
};

export function sessionChip(status: SessionStatus): ChipSpec {
  return { tone: SESSION_CHIP_TONE[status], label: SESSION_CHIP_LABEL[status] };
}

const FRESHNESS_CHIP_TONE: Record<WorkspaceState["freshness"], ChipTone> = {
  active: "live",
  stale: "muted",
  blocked: "live",
  done: "landed",
};

export function freshnessChip(freshness: WorkspaceState["freshness"]): ChipSpec {
  return { tone: FRESHNESS_CHIP_TONE[freshness], label: freshness };
}

export function formatDurationMs(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "0ms";
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) {
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

export function isStreamingKind(kind: string): boolean {
  return kind === "message.delta";
}
