import { describe, expect, it } from "vitest";

import type { TitleOverlay } from "@fableon/composition-core";

import { titleFont, wrapTitle } from "./titles";

const TITLE: TitleOverlay = {
  id: "opening",
  text: "Where the Light Lands",
  startFrame: 24,
  endFrame: 108,
  fadeInFrames: 18,
  fadeOutFrames: 18,
  x: 960,
  y: 260,
  maxWidth: 240,
  fontSize: 64,
  color: "#f8f5ed",
  align: "center",
};

const measure = (text: string) => text.length * 20;

describe("story title layout", () => {
  it("wraps a title deterministically within its maximum width", () => {
    const wrapped = wrapTitle(TITLE, measure);
    expect(wrapped.lines.length).toBeGreaterThan(1);
    for (const line of wrapped.lines) {
      expect(measure(line)).toBeLessThanOrEqual(TITLE.maxWidth);
    }
    expect(wrapped.lines.join(" ")).toBe(TITLE.text);
    expect(wrapped.lineHeight).toBe(80);
    expect(wrapped.font).toContain("64px");
    expect(titleFont(TITLE)).toContain("Georgia");
  });

  it("keeps a short title on one line and handles empty text", () => {
    const short = wrapTitle({ ...TITLE, text: "Home", maxWidth: 400 }, measure);
    expect(short.lines).toEqual(["Home"]);
    const empty = wrapTitle({ ...TITLE, text: "   " }, measure);
    expect(empty.lines).toEqual([]);
  });

  it("wraps the actual ending title into readable lines", () => {
    const ending: TitleOverlay = {
      ...TITLE,
      id: "ending",
      text: "Sometimes, the smallest journeys lead us home.",
      maxWidth: 360,
      fontSize: 38,
    };
    const wrapped = wrapTitle(ending, measure);
    expect(wrapped.lines.length).toBeGreaterThan(1);
    expect(wrapped.lines.join(" ")).toBe(ending.text);
  });
});
