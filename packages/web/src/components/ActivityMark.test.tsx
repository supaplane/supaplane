import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ACTIVITY_MARK_TOKENS, ActivityMark } from "./ActivityMark.js";

describe("ActivityMark", () => {
  it("binds idle geometry to passenger tokens and blinks the eyes", () => {
    const html = renderToStaticMarkup(<ActivityMark state="idle" label="Connected" />);

    expect(html).toContain('aria-label="Connected"');
    expect(html).toContain(`fill="${ACTIVITY_MARK_TOKENS.cream}"`);
    expect(html).toContain(`fill="${ACTIVITY_MARK_TOKENS.navy}"`);
    expect(html).toContain('class="fold-idle-blink"');
    expect(html).not.toContain("fold-orbit-rotor");
    expect(html).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("lets the face go and orbits the moon when working", () => {
    const html = renderToStaticMarkup(<ActivityMark state="working" />);

    expect(html).toContain('aria-label="Working"');
    expect(html).toContain(`fill="${ACTIVITY_MARK_TOKENS.cream}"`);
    expect(html).toContain(`stroke="${ACTIVITY_MARK_TOKENS.ring}"`);
    expect(html).toContain(`fill="${ACTIVITY_MARK_TOKENS.moon}"`);
    expect(html).toContain('class="fold-orbit-rotor"');
    expect(html).not.toContain("fold-idle-blink");
    expect(html).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });
});
