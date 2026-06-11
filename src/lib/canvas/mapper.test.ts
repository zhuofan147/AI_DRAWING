import { describe, expect, it } from "vitest";
import { buildCanvasGraph } from "./mapper";

describe("buildCanvasGraph", () => {
  it("maps project data into canvas nodes and edges", () => {
    const graph = buildCanvasGraph({
      id: "project-1",
      title: "Demo",
      status: "draft",
      episodes: [{ id: "episode-1", title: "Pilot", sequence: 1, status: "draft" }],
      characters: [{ id: "char-1", name: "Mira", scope: "main", referenceImage: "/uploads/mira.png" }],
      shots: [
        {
          id: "shot-1",
          sequence: 1,
          episodeId: "episode-1",
          prompt: "Mira enters the archive",
          status: "pending",
          assets: [
            {
              id: "asset-1",
              shotId: "shot-1",
              type: "first_frame",
              fileUrl: "/uploads/frame.png",
              status: "completed",
              isActive: 1,
            },
          ],
        },
      ],
    });

    expect(graph.nodes.map((node) => node.id)).not.toContain("project:project-1");
    expect(graph.nodes.map((node) => node.id)).toContain("episode:episode-1");
    expect(graph.nodes.map((node) => node.id)).toContain("character:char-1");
    expect(graph.nodes.map((node) => node.id)).toContain("shot:shot-1");
    expect(graph.nodes.map((node) => node.id)).toContain("asset:asset-1");
    expect(graph.edges.some((edge) => edge.source === "episode:episode-1" && edge.target === "shot:shot-1")).toBe(true);
  });

  it("preserves saved node positions and drops stale layout entries", () => {
    const graph = buildCanvasGraph(
      { id: "project-1", title: "Demo", episodes: [], characters: [], shots: [] },
      {
        nodes: [
          { id: "manual:text:1", position: { x: 10, y: 20 }, data: {
            id: "manual:text:1",
            kind: "text",
            entityId: "manual:text:1",
            title: "文本",
            subtitle: "草稿",
            status: "idle",
            actions: ["generate-script"],
            meta: { source: "manual" },
          } },
          { id: "missing:old", position: { x: 999, y: 999 } },
        ],
      },
    );

    expect(graph.layoutNodes.find((node) => node.id === "manual:text:1")?.position).toEqual({ x: 10, y: 20 });
    expect(graph.layoutNodes.some((node) => node.id === "missing:old")).toBe(false);
  });

  it("keeps saved manual edges when both nodes still exist", () => {
    const graph = buildCanvasGraph(
      {
        id: "project-1",
        title: "Demo",
        episodes: [{ id: "episode-1", title: "Pilot", sequence: 1, status: "draft" }],
        characters: [],
        shots: [],
      },
      {
        edges: [
          { id: "manual-1", source: "episode:episode-1", target: "manual:text:1", label: "manual" },
          { id: "stale-1", source: "episode:episode-1", target: "shot:missing", label: "manual" },
        ],
        nodes: [
          { id: "manual:text:1", position: { x: 100, y: 100 }, data: {
            id: "manual:text:1",
            kind: "text",
            entityId: "manual:text:1",
            title: "文本",
            subtitle: "草稿",
            status: "idle",
            actions: ["generate-script"],
            meta: { source: "manual" },
          } },
        ],
      },
    );

    expect(graph.edges.some((edge) => edge.id === "manual-1")).toBe(true);
    expect(graph.edges.some((edge) => edge.id === "stale-1")).toBe(false);
  });

  it("does not show an idle export node before the project has output", () => {
    const graph = buildCanvasGraph({
      id: "project-1",
      title: "Empty Project",
      episodes: [],
      characters: [],
      shots: [],
    });

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("shows the export node once a final video exists", () => {
    const graph = buildCanvasGraph({
      id: "project-1",
      title: "Finished Project",
      finalVideoUrl: "/exports/final.mp4",
      episodes: [],
      characters: [],
      shots: [],
    });

    expect(graph.nodes.map((node) => node.id)).toContain("export:project-1");
    expect(graph.edges).toEqual([]);
  });
});
