import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StudioPage from "./page";

describe("StudioPage", () => {
  it("renders the sample project inspector shell", () => {
    render(<StudioPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Fableon Studio" })).toBeInTheDocument();
    expect(screen.getAllByText("Where the Light Lands").length).toBeGreaterThan(0);

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

  it("clearly states that no renderer is connected", () => {
    render(<StudioPage />);

    expect(screen.getByText(/no painterly preview yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/renderer not connected/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/scene data is driving this inspector/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
  });

  it("provides real timeline controls and a route back to the public site", () => {
    render(<StudioPage />);

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
