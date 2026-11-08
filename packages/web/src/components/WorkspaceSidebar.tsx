import { useEffect, useState } from "react";
import type { SupaplaneClient } from "@echohello/client";
import type { WorkspaceState } from "@echohello/protocol";

import { ActivityMark } from "./ActivityMark.js";
import { StatusChip } from "./StatusChip.js";
import { ThinkingDots } from "./ThinkingDots.js";
import { freshnessChip } from "./loading.js";

interface Props {
  client: SupaplaneClient | null;
  /** Fired when the user clicks "Open diff" on a workspace card. */
  onDemoDiff?: (workspaceId: string) => void;
}

export function WorkspaceSidebar({ client, onDemoDiff }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceState[]>([]);

  useEffect(() => {
    if (!client) return;
    const off = client.onWorkspaceState((ws) => {
      setWorkspaces((prev) => {
        const idx = prev.findIndex((w) => w.workspaceId === ws.workspaceId);
        if (idx === -1) return [...prev, ws];
        const next = prev.slice();
        next[idx] = ws;
        return next;
      });
    });
    return off;
  }, [client]);

  return (
    <aside className="flex w-72 flex-col border-r border-fold-border bg-fold-panel">
      <div className="border-b border-fold-border px-4 py-2 text-xs uppercase tracking-wider text-fold-subtle">
        Workspaces
      </div>
      <ul className="flex-1 overflow-y-auto">
        {client === null && (
          <li className="flex items-center gap-2 px-4 py-3 text-sm text-fold-muted">
            <ActivityMark state="working" label="Looking for workspaces" />
            <span>Looking for workspaces…</span>
          </li>
        )}
        {client !== null && workspaces.length === 0 && (
          <li className="px-4 py-5 text-sm">
            <div className="flex flex-col items-start gap-2">
              <ActivityMark state="idle" size={28} label="No workspaces" />
              <p className="text-fold-text">No workspaces yet.</p>
              <p className="text-xs leading-relaxed text-fold-muted">
                Run <code className="rounded bg-fold-elevated px-1">supaplane agent start</code> to
                create one.
              </p>
              <ThinkingDots label="Waiting for first workspace" />
            </div>
          </li>
        )}
        {workspaces.map((ws) => {
          const chip = freshnessChip(ws.freshness);
          return (
            <li
              key={ws.workspaceId}
              className="border-b border-fold-border-subtle px-4 py-3 text-sm hover:bg-fold-elevated"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 truncate font-medium">
                  {ws.freshness === "active" ? (
                    <ActivityMark state="working" label="Workspace active" />
                  ) : (
                    <ActivityMark state="idle" label="Workspace idle" />
                  )}
                  <span className="truncate">{ws.repoName ?? ws.cwd}</span>
                </span>
                <StatusChip tone={chip.tone} label={chip.label} />
              </div>
              <div className="mt-1 truncate text-xs text-fold-muted">
                {ws.branch ?? "no branch"}
              </div>
              {onDemoDiff ? (
                <button
                  onClick={() => onDemoDiff(ws.workspaceId)}
                  className="mt-2 min-h-11 rounded-md border border-fold-border-control bg-fold-inset px-2 text-xs text-fold-text-secondary transition hover:border-fold-accent hover:text-fold-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fold-accent"
                >
                  Open diff
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
