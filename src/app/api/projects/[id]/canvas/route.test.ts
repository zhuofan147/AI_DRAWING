import { describe, expect, it } from "vitest";
import { parseJson, sanitizeCanvasLayoutPayload } from "./route";

describe("canvas layout api helpers", () => {
  it("parses json with fallback", () => {
    expect(parseJson("[1]", [])).toEqual([1]);
    expect(parseJson("bad json", [])).toEqual([]);
  });

  it("sanitizes layout payload", () => {
    const payload = sanitizeCanvasLayoutPayload({
      nodes: [{ id: "project:1", position: { x: 1, y: 2 } }],
      edges: [{ id: "a", source: "a", target: "b" }],
      viewport: { x: 3, y: 4, zoom: 0.8 },
    });

    expect(payload.nodes[0]).toEqual({ id: "project:1", position: { x: 1, y: 2 } });
    expect(payload.viewport).toEqual({ x: 3, y: 4, zoom: 0.8 });
  });
});
