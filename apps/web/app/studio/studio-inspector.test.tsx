import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { renderFrameToCanvas } from "@fableon/render-engine";

import StudioPage from "./page";

const renderMock = vi.mocked(renderFrameToCanvas);

function getScrubber(): HTMLElement {
  return screen.getByRole("slider", { name: "Global frame" });
}

async function renderReadyInspector(): Promise<void> {
  render(<StudioPage />);
  await waitFor(() => {
    expect(screen.getByTestId("preview-surface")).toHaveAttribute("data-preview-state", "ready");
  });
}

beforeEach(() => {
  renderMock.mockClear();
  renderMock.mockResolvedValue({ renderedLayerIds: [], skippedLayerIds: [] });
});

describe("Studio timeline inspector", () => {
  it("starts at frame 0 with the first scene and its evaluated layers", async () => {
    await renderReadyInspector();

    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 0");
    expect(screen.getByLabelText("Current timestamp")).toHaveTextContent("0:00.000");
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("Dawn over the painted forest");
    expect(
      screen.getByRole("button", { name: "Select scene 1: Dawn over the painted forest" }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("button", { name: /select layer/i })).toHaveLength(3);
    expect(renderMock).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({ globalFrame: 0, sceneId: "dawn" }),
      expect.objectContaining({ width: 1920, height: 1080 }),
    );
  });

  it("updates scene and evaluator values when the scrubber moves", async () => {
    await renderReadyInspector();

    fireEvent.change(getScrubber(), { target: { value: "216" } });

    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 216");
    expect(screen.getByLabelText("Current timestamp")).toHaveTextContent("0:09.000");
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("A path between the trunks");
    expect(screen.getAllByRole("button", { name: /select layer/i })).toHaveLength(2);

    await waitFor(() => {
      expect(renderMock).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({ globalFrame: 216, sceneId: "glide" }),
        expect.anything(),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Select layer Bird in flight" }));

    expect(screen.getByLabelText("Resolved x")).toHaveTextContent("520.00 px");
    expect(screen.getByLabelText("Resolved y")).toHaveTextContent("280.00 px");
    expect(screen.getByLabelText("Resolved opacity")).toHaveTextContent("0.95");
  });

  it("jumps to scene boundaries from the scene list", async () => {
    await renderReadyInspector();

    fireEvent.click(screen.getByRole("button", { name: "Select scene 3: The ribbon of sunlight" }));

    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 528");
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("The ribbon of sunlight");
    expect(
      screen.getByRole("button", { name: "Select layer Bird descending" }),
    ).toBeInTheDocument();
  });

  it("moves between scenes with real previous and next controls", async () => {
    await renderReadyInspector();

    const previous = screen.getByRole("button", { name: /previous scene/i });
    const next = screen.getByRole("button", { name: /next scene/i });

    expect(previous).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 216");
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("A path between the trunks");

    fireEvent.click(next);
    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 528");

    fireEvent.click(previous);
    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 216");
  });

  it("selects the final valid frame and displays its evaluated title state", async () => {
    await renderReadyInspector();

    fireEvent.change(getScrubber(), { target: { value: "1151" } });

    expect(screen.getByLabelText("Current frame")).toHaveTextContent("Frame 1151");
    expect(screen.getByLabelText("Current timestamp")).toHaveTextContent("0:47.958");
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("The forest exhales");

    fireEvent.click(screen.getByRole("button", { name: "Select layer End title" }));

    expect(screen.getByLabelText("Resolved opacity")).toHaveTextContent("1.00");
    expect(screen.getByText(/Text · “Where the Light Lands”/)).toBeInTheDocument();
  });

  it("preserves exact boundary semantics at the scene transition", async () => {
    await renderReadyInspector();

    fireEvent.change(getScrubber(), { target: { value: "527" } });
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("A path between the trunks");

    fireEvent.change(getScrubber(), { target: { value: "528" } });
    expect(screen.getByLabelText("Active scene")).toHaveTextContent("The ribbon of sunlight");
  });

  it("surfaces renderer and asset failures instead of hiding them", async () => {
    renderMock.mockRejectedValueOnce(
      new Error('Could not resolve asset "bird" for layer "dawn-bird": HTTP 404'),
    );

    render(<StudioPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/frame could not be rendered/i);
    expect(alert).toHaveTextContent(/asset "bird"/i);
    expect(screen.getByTestId("preview-surface")).toHaveAttribute("data-preview-state", "error");
    expect(screen.getByRole("button", { name: "Export frame PNG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play animation" })).toBeDisabled();
  });
});
