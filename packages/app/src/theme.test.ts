import { describe, expect, it } from "vitest";

import { colors, radius } from "./theme.js";

describe("Fold native theme", () => {
  it("uses the documented dark Fold contract", () => {
    expect(colors.bg).toBe("#121212");
    expect(colors.surface).toBe("#1a1a1a");
    expect(colors.accent).toBe("#e8b33d");
    expect(colors.text).toBe("#f5f0e8");
    expect(colors.textOnAccent).toBe("#0a0a0a");
    expect(radius.md).toBe(8);
    expect(radius.lg).toBe(12);
  });
});
