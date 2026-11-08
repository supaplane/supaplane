import { describe, expect, it } from "vitest";

import { formatDurationMs, freshnessChip, isStreamingKind, sessionChip } from "./loading.js";

describe("sessionChip", () => {
  it("maps running and waiting to the live tone", () => {
    expect(sessionChip("running")).toEqual({ tone: "live", label: "Working" });
    expect(sessionChip("waiting")).toEqual({ tone: "live", label: "Waiting" });
  });

  it("maps done to landed and error to error", () => {
    expect(sessionChip("done").tone).toBe("landed");
    expect(sessionChip("error").tone).toBe("error");
  });

  it("keeps idle and paused quiet", () => {
    expect(sessionChip("idle").tone).toBe("muted");
    expect(sessionChip("paused").tone).toBe("muted");
  });
});

describe("freshnessChip", () => {
  it("keeps the workspace freshness label verbatim", () => {
    expect(freshnessChip("active")).toEqual({ tone: "live", label: "active" });
    expect(freshnessChip("stale").tone).toBe("muted");
    expect(freshnessChip("blocked").tone).toBe("live");
    expect(freshnessChip("done").tone).toBe("landed");
  });
});

describe("formatDurationMs", () => {
  it("formats sub-second durations as milliseconds", () => {
    expect(formatDurationMs(850)).toBe("850ms");
    expect(formatDurationMs(0)).toBe("0ms");
  });

  it("formats seconds with one decimal when needed", () => {
    expect(formatDurationMs(1500)).toBe("1.5s");
    expect(formatDurationMs(2000)).toBe("2s");
  });

  it("formats minutes without seconds noise", () => {
    expect(formatDurationMs(65_000)).toBe("1m 5s");
    expect(formatDurationMs(120_000)).toBe("2m");
  });

  it("guards non-finite input", () => {
    expect(formatDurationMs(Number.NaN)).toBe("0ms");
  });
});

describe("isStreamingKind", () => {
  it("only treats message deltas as streaming", () => {
    expect(isStreamingKind("message.delta")).toBe(true);
    expect(isStreamingKind("message.final")).toBe(false);
    expect(isStreamingKind("tool.start")).toBe(false);
  });
});
