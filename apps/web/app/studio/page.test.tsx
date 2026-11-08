import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@fableon/render-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@fableon/render-engine")>();
  return {
    ...actual,
    renderFrameToCanvas: vi.fn(async () => ({
      renderedLayerIds: [],
      skippedLayerIds: [],
    })),
  };
});

import StudioPage from "./page";

describe("StudioPage", () => {
  it("renders the sample project and live preview shell", async () => {
    render(<StudioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("preview-surface")).toHaveAttribute("data-preview-state", "ready");
    });

    expect(screen.getByRole("heading", { level: 1, name: "Fableon Studio" })).toBeInTheDocument();
    expect(screen.getAllByText("Where the Light Lands").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: /rendered frame preview at frame 0/i }),
    ).toBeInTheDocument();

    for (const panel of [
      "Project",
      "Scenes",
      "Canvas / Preview",
      "Timeline",
      "Evaluated layers",
      "Assets",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: panel })).toBeInTheDocument();
    }
  });

  it("shows real rendering, playback, and export affordances", async () => {
    render(<StudioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("preview-surface")).toHaveAttribute("data-preview-state", "ready");
    });

    expect(screen.getByText(/real canvas 2d output/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play animation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export frame PNG" })).toBeEnabled();
    expect(screen.getByLabelText("Last render time")).toBeInTheDocument();
  });

  it("provides timeline controls and a route back to the public site", async () => {
    render(<StudioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("preview-surface")).toHaveAttribute("data-preview-state", "ready");
    });

    expect(screen.getByRole("slider", { name: "Global frame" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next scene/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous scene/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /select scene/i })).toHaveLength(4);

    const homeLinks = screen
      .getAllByRole("link", { name: /fableon home/i })
      .filter((link) => link.getAttribute("href") === "/");
    expect(homeLinks.length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /exit studio/i })).toHaveAttribute("href", "/");
  });
});
