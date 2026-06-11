import { describe, expect, test } from "vitest";
import { scriptFromImportedEpisode } from "@/lib/import/episodes";

describe("import episode helpers", () => {
  test("uses the full imported episode idea as the script source", () => {
    expect(scriptFromImportedEpisode({ idea: "第一场完整剧情", description: "短摘要" })).toBe("第一场完整剧情");
  });

  test("falls back to description when idea is empty", () => {
    expect(scriptFromImportedEpisode({ idea: "  ", description: "短摘要" })).toBe("短摘要");
  });
});
