import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StudioPage from "./page";

describe("StudioPage", () => {
  it("labels every workspace region as not yet implemented", () => {
    render(<StudioPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Fableon Studio" })).toBeInTheDocument();

    for (const panel of [
      "Project",
      "Scenes",
      "Canvas / Preview",
      "Timeline",
      "Assets",
      "Properties",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: panel })).toBeInTheDocument();
    }

    expect(screen.getAllByText("Not yet implemented")).toHaveLength(6);
  });

  it("does not expose fake interactive controls", () => {
    render(<StudioPage />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText(/no renderer connected/i)).toBeInTheDocument();
    expect(screen.getByText(/placeholder stage/i)).toBeInTheDocument();
  });

  it("provides a route back to the public site", () => {
    render(<StudioPage />);

    const homeLinks = screen
      .getAllByRole("link", { name: /fableon home/i })
      .filter((link) => link.getAttribute("href") === "/");
    expect(homeLinks.length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /exit studio/i })).toHaveAttribute("href", "/");
  });
});
