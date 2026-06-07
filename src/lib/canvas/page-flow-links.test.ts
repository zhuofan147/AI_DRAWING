import { describe, expect, it } from "vitest";
import { buildCanvasPageFlowLinks } from "./page-flow-links";

describe("buildCanvasPageFlowLinks", () => {
  it("builds project-level page workflow links from the canvas", () => {
    expect(buildCanvasPageFlowLinks("zh", "project-1")).toEqual([
      { key: "episodes", href: "/zh/project/project-1/episodes" },
      { key: "script", href: "/zh/project/project-1/script" },
      { key: "characters", href: "/zh/project/project-1/characters" },
      { key: "storyboard", href: "/zh/project/project-1/storyboard" },
      { key: "preview", href: "/zh/project/project-1/preview" },
      { key: "import", href: "/zh/project/project-1/import" },
      { key: "prompts", href: "/zh/project/project-1/prompts" },
    ]);
  });

  it("encodes project ids before placing them in route segments", () => {
    expect(buildCanvasPageFlowLinks("zh", "project with space")[0]?.href).toBe(
      "/zh/project/project%20with%20space/episodes",
    );
  });
});
