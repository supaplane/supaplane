import { useState } from "react";
import type { SupaplaneClient } from "@echohello/client";

interface Props {
  client: SupaplaneClient | null;
  /** Optional diff request opened from the workspace sidebar (or composer). */
  diff?: {
    name: string;
    before: string;
    after: string;
    prevName?: string;
  } | null;
}

export function Composer({ client, diff }: Props) {
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState("");

  const send = (): void => {
    if (!client || !prompt.trim() || !sessionId.trim()) return;
    client.sendCommand({
      type: "session.send",
      sessionId: sessionId.trim(),
      prompt: prompt.trim(),
      attachments: [],
    });
    setPrompt("");
  };

  const openDiff = (): void => {
    if (!client) return;
    const session = sessionId.trim();
    if (!session) return;
    client.sendCommand({
      type: "diff.open",
      sessionId: session,
      path: "(composer demo)",
    });
  };

  return (
    <footer className="border-t border-fold-border bg-fold-panel px-6 py-3">
      <div className="flex gap-3">
        <input
          className="min-h-11 w-48 rounded-md border border-fold-border-control bg-fold-inset px-3 text-xs font-mono text-fold-text placeholder:text-fold-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fold-accent"
          placeholder="session id"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
        <input
          className="min-h-11 flex-1 rounded-md border border-fold-border-control bg-fold-inset px-3 text-sm text-fold-text placeholder:text-fold-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fold-accent"
          placeholder="Send a prompt…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          className="min-h-11 rounded-md border border-fold-border-control bg-fold-inset px-3 text-sm text-fold-text transition hover:bg-fold-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fold-accent disabled:opacity-40"
          disabled={!client || !sessionId.trim()}
          onClick={openDiff}
          title="Send a diff.open command for this session"
        >
          diff.open
        </button>
        <button
          className="min-h-11 rounded-md bg-fold-accent px-4 text-sm font-medium text-fold-on-accent transition hover:bg-fold-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fold-accent disabled:opacity-40"
          disabled={!client || !prompt.trim() || !sessionId.trim()}
          onClick={send}
        >
          Send
        </button>
      </div>
      {diff ? (
        <p className="mt-2 truncate text-xs text-fold-muted">
          Opened diff for <span className="font-mono text-fold-text-secondary">{diff.name}</span>
          {diff.prevName ? (
            <>
              {" "}
              (renamed from <span className="font-mono">{diff.prevName}</span>)
            </>
          ) : null}
        </p>
      ) : null}
    </footer>
  );
}
