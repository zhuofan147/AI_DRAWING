import { describe, expect, test } from "vitest";
import { getStylePreset, stylePresets } from "@/lib/style-library";

describe("style library presets", () => {
  test("provides project-ready style context for every preset", () => {
    expect(stylePresets.length).toBeGreaterThanOrEqual(4);

    for (const preset of stylePresets) {
      expect(preset.id).toMatch(/^[a-z0-9-]+$/);
      expect(preset.title).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.colorPalette.length).toBeGreaterThan(8);
      expect(preset.worldSetting.length).toBeGreaterThan(20);
    }
  });

  test("looks up presets by id", () => {
    const preset = getStylePreset("ink-noir");

    expect(preset?.title).toBe("水墨黑色电影");
    expect(getStylePreset("missing")).toBeNull();
  });
});
