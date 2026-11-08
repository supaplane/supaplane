import { useEffect, useRef, useState } from "react";
import type { SupaplaneClient } from "@echohello/client";
import type { AgentEvent, SessionStatus } from "@echohello/protocol";

import { ActivityMark } from "./ActivityMark.js";
import { MarkdownView } from "./MarkdownView.js";
import { StatusChip } from "./StatusChip.js";
import { ThinkingDots } from "./ThinkingDots.js";
import { formatDurationMs, isStreamingKind, sessionChip } from "./loading.js";

interface Props {
  client: SupaplaneClient | null;
}

interface Line {
  id: string;
  text: string;
  kind: AgentEvent["type"];
  markdown?: boolean;
}

/**
 * The agent transcript renderer.
 *
 * Long message events stream through markdown-it (token-stream parser with
 * safe defaults) for agent text, and small line entries cover the meta
 * events (tool.start, status, error, permission_request).
 *
 * Loading states follow Fold: idle is the passenger egg, working is an orbit
 * ring with an amber moon, thinking is a three-dot fade. The mark never
 * spins and status also lands in a chip, not a recoloured plane.
 *
 * TODO: integrate Pretext for DOM-free text measurement so long-running
 * transcripts stay performant — see docs/architecture.md.
 * TODO: replace the simple list with a virtualised list
 * (`@tanstack/react-virtual`) once transcript sizes start exceeding a few
 * hundred events.
 */
export function AgentTranscript({ client }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [pendingTools, setPendingTools] = useState<ReadonlyMap<string, string>>(new Map());
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) return;
    const off = client.onAgentEvent((event) => {
      if (event.type === "tool.start") {
        setPendingTools((prev) => new Map(prev).set(event.toolCallId, event.name));
      } else if (event.type === "tool.result") {
        setPendingTools((prev) => {
          const next = new Map(prev);
          next.delete(event.toolCallId);
          return next;
        });
      } else if (event.type === "status") {
        setSessionStatus(event.status);
      }
      setLines((prev) => {
        // Coalesce streaming `message.delta` into the latest open message
        // line so the transcript doesn't fragment on every token push.
        const last = prev[prev.length - 1];
        if (event.type === "message.delta" && last && last.kind === "message.delta") {
          const next = prev.slice();
          next[next.length - 1] = {
            ...last,
            text: last.text + event.text,
          };
          return next;
        }
        return [
          ...prev,
          {
            id: `${event.type}-${event.ts}-${Math.random().toString(36).slice(2, 6)}`,
            text: describeEvent(event),
            kind: event.type,
            markdown: isMarkdown(event),
          },
        ];
      });
    });
    return off;
  }, [client]);

  useEffect(() => {
    if (lines.length === 0) return;
    const id = setTimeout(() => containerRef.current?.scrollTo({ top: 9e9 }), 50);
    return () => clearTimeout(id);
  }, [lines.length]);

  const last = lines.at(-1) ?? null;
  const streaming = last !== null && isStreamingKind(last.kind);
  const runningTools = [...pendingTools.values()];
  const showActivity =
    runningTools.length > 0 ||
    streaming ||
    sessionStatus === "running" ||
    sessionStatus === "waiting";

  return (
    <section
      ref={containerRef}
      className="min-w-0 flex-1 overflow-y-auto bg-fold-bg px-6 py-4 font-mono text-sm leading-relaxed"
    >
      {lines.length === 0 && (
        <div className="flex flex-col items-start gap-2 py-6">
          <ActivityMark state="idle" size={32} label="No transcript yet" />
          <p className="text-fold-text">Transcript is empty.</p>
          <p className="max-w-md text-xs leading-relaxed text-fold-muted">
            Start an agent session from the CLI to see events stream here. The egg holds still while
            idle — working becomes an orbit.
          </p>
        </div>
      )}
      {lines.map((line) => (
        <article key={line.id} className="border-b border-fold-border-subtle pb-3">
          <header className="mb-1 flex items-center gap-2 text-xs text-fold-subtle">
            {line.kind === "tool.start" ? (
              <ActivityMark state="working" label={`Running ${line.text}`} />
            ) : null}
            {line.kind === "tool.result" ? <span aria-hidden="true">✓</span> : null}
            <span>{line.kind}</span>
            {!line.markdown && line.kind !== "message.delta" ? (
              <span className="text-fold-text-secondary">{line.text}</span>
            ) : null}
          </header>
          {line.markdown ? (
            <MarkdownView source={line.text} />
          ) : line.kind === "message.delta" ? null : (
            <pre className="whitespace-pre-wrap text-fold-text">{line.text}</pre>
          )}
        </article>
      ))}
      {showActivity && (
        <div className="flex items-center gap-2 pt-3 text-xs text-fold-muted">
          <ActivityMark state="working" label="Agent working" />
          {runningTools.length > 0 ? (
            <span>Running {runningTools.join(", ")}…</span>
          ) : streaming ? (
            <span className="flex items-center gap-2">
              <span>Writing…</span>
              <ThinkingDots label="Agent writing" />
            </span>
          ) : sessionStatus !== null ? (
            <StatusChip
              tone={sessionChip(sessionStatus).tone}
              label={sessionChip(sessionStatus).label}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function isMarkdown(event: AgentEvent): boolean {
  return event.type === "message.delta" || event.type === "message.final";
}

function describeEvent(event: AgentEvent): string {
  switch (event.type) {
    case "message.delta":
      return event.text;
    case "message.final":
      return event.text;
    case "tool.start":
      return `${event.name}`;
    case "tool.progress":
      return `${event.toolCallId} · progress`;
    case "tool.result":
      return `${event.toolCallId} · done (${formatDurationMs(event.durationMs)})`;
    case "status":
      return `status: ${event.status}`;
    case "error":
      return `${event.code}: ${event.message}`;
    case "permission_request":
      return `permission: ${event.reason}`;
    default: {
      const _exhaustive: never = event;
      return String(_exhaustive);
    }
  }
}
