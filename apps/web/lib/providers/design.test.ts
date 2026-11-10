import { describe, expect, it } from "vitest";

import {
  buildBackgroundPrompt,
  buildMasterPrompt,
  buildPartPrompt,
  characterDesign,
} from "./design";

describe("folk provider design system", () => {
  it("keeps the artisan identity anchors in the master prompt", () => {
    const prompt = buildMasterPrompt("artisan", "openai");
    for (const anchor of characterDesign("artisan").identityAnchors) {
      expect(prompt.toLowerCase()).toContain(anchor.toLowerCase());
    }
    expect(prompt).toMatch(/transparent background/i);
  });

  it("changes the transparency instruction for Gemini instead of pretending parity", () => {
    const prompt = buildMasterPrompt("artisan", "gemini");
    expect(prompt).toMatch(/no native transparency/i);
    expect(prompt).toMatch(/masked/i);
  });

  it("builds a part prompt with hidden joint overlap and no unrelated parts", () => {
    const prompt = buildPartPrompt({
      character: "artisan",
      partId: "artisan_nearForearm",
      provider: "openai",
    });
    expect(prompt).toMatch(/near forearm/i);
    expect(prompt).toMatch(/20–30 px|20-30 px/i);
    expect(prompt).toMatch(/do not include other body parts/i);
  });

  it("builds background-only prompts", () => {
    const prompt = buildBackgroundPrompt("courtyard");
    expect(prompt).toMatch(/background only/i);
    expect(prompt).toMatch(/no people/i);
    expect(prompt).toMatch(/16:9/i);
  });
});
