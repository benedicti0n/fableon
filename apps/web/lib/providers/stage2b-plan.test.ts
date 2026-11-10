import { describe, expect, it } from "vitest";

import { ARTISAN_V2_SLOTS } from "./rig-slots";
import { STAGE2B_SHEETS, STAGE2B_SHEET_ORDER, stage2bSheetPrompt } from "./stage2b-plan";

describe("Stage 2B generation plan", () => {
  it("covers every rig slot exactly once across four sheets", () => {
    const planned = STAGE2B_SHEET_ORDER.flatMap((id) => STAGE2B_SHEETS[id].slots).filter(Boolean);
    const required = ARTISAN_V2_SLOTS.map((slot) => slot.partId);
    expect(planned).toHaveLength(31);
    expect(new Set(planned).size).toBe(31);
    expect(new Set(planned)).toEqual(new Set(required));
  });

  it("keeps the sheet grids large enough for the declared slots", () => {
    for (const id of STAGE2B_SHEET_ORDER) {
      const sheet = STAGE2B_SHEETS[id];
      expect(sheet.slots.length).toBe(sheet.columns * sheet.rows);
      expect(sheet.layout).toHaveLength(sheet.rows);
    }
  });

  it("uses native alpha for OpenAI and chroma key for Gemini", () => {
    const openai = stage2bSheetPrompt("openai", STAGE2B_SHEETS.head);
    const gemini = stage2bSheetPrompt("gemini", STAGE2B_SHEETS.head);
    expect(openai).toMatch(/transparent background/i);
    expect(gemini).toMatch(/#00FF00/);
    expect(gemini).toMatch(/chroma-key green/i);
  });

  it("forbids text, labels and a complete character in every sheet prompt", () => {
    for (const id of STAGE2B_SHEET_ORDER) {
      const prompt = stage2bSheetPrompt("openai", STAGE2B_SHEETS[id]);
      expect(prompt).toMatch(/no text/i);
      expect(prompt).toMatch(/no labels/i);
      expect(prompt).toMatch(/no complete character/i);
    }
  });
});
