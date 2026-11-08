import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PIPELINE_STAGES } from "@fableon/shared";

import HomePage from "./page";

describe("HomePage", () => {
  it("presents the product identity and primary studio entry point", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /stories, painted into motion/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("AI-native animation studio")).toBeInTheDocument();

    const studioLinks = screen
      .getAllByRole("link", { name: /studio/i })
      .filter((link) => link.getAttribute("href") === "/studio");
    expect(studioLinks.length).toBeGreaterThan(0);
  });

  it("shows the full ten-stage pipeline as planned work", () => {
    render(<HomePage />);

    const pipeline = screen.getByRole("region", { name: /one story, ten deliberate stages/i });
    const stages = within(pipeline).getAllByRole("listitem");

    expect(stages).toHaveLength(PIPELINE_STAGES.length);
    expect(within(pipeline).getByText("Idea")).toBeInTheDocument();
    expect(within(pipeline).getByText("Export")).toBeInTheDocument();
    expect(within(pipeline).getByText(/Phase 0 implements the foundation/i)).toBeInTheDocument();
  });

  it("renders the concept plate with an accessible description", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("img", { name: /bird flying through a twilight painted forest/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/concept · not rendered/i)).toBeInTheDocument();
  });
});
