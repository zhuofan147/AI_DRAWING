import { describe, expect, it } from "vitest";
import type { CanvasNodeData } from "./types";
import { canvasViewKinds, isNodeVisibleInCanvasView } from "./views";

function node(overrides: Partial<CanvasNodeData>): CanvasNodeData {
  return {
    id: "node-1",
    kind: "project",
    entityId: "entity-1",
    title: "Node",
    subtitle: "Subtitle",
    status: "idle",
    actions: [],
    meta: {},
    ...overrides,
  };
}

describe("canvas view rules", () => {
  it("keeps the expected view order", () => {
    expect(canvasViewKinds).toEqual([
      "flow",
      "asset_board",
      "task_center",
      "director",
      "panorama_360",
      "director_3d",
      "camera_plan",
    ]);
  });

  it("shows every node in the flow view", () => {
    expect(isNodeVisibleInCanvasView(node({ kind: "project" }), "flow")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "asset" }), "flow")).toBe(true);
  });

  it("focuses the asset board on assets and visual character references", () => {
    expect(isNodeVisibleInCanvasView(node({ kind: "asset" }), "asset_board")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "character", previewUrl: "/mira.png" }), "asset_board")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "character", previewUrl: null }), "asset_board")).toBe(false);
    expect(isNodeVisibleInCanvasView(node({ kind: "episode" }), "asset_board")).toBe(false);
  });

  it("focuses the task center on executable or active nodes", () => {
    expect(isNodeVisibleInCanvasView(node({ kind: "shot", actions: ["generate-frame"] }), "task_center")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "episode", actions: ["batch-videos"] }), "task_center")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "asset", status: "failed" }), "task_center")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "project", actions: ["open"] }), "task_center")).toBe(false);
  });

  it("shows production objects in director-oriented views", () => {
    expect(isNodeVisibleInCanvasView(node({ kind: "episode" }), "director")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "shot" }), "director")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "asset" }), "director")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "export" }), "director")).toBe(false);

    expect(isNodeVisibleInCanvasView(node({ kind: "character" }), "director_3d")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "shot" }), "camera_plan")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "character" }), "camera_plan")).toBe(false);
  });

  it("only shows panorama assets in the 360 view", () => {
    expect(isNodeVisibleInCanvasView(node({ kind: "asset", meta: { type: "panorama_360" } }), "panorama_360")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "asset", title: "大厅全景" }), "panorama_360")).toBe(true);
    expect(isNodeVisibleInCanvasView(node({ kind: "asset", meta: { type: "first_frame" } }), "panorama_360")).toBe(false);
    expect(isNodeVisibleInCanvasView(node({ kind: "shot" }), "panorama_360")).toBe(false);
  });
});
