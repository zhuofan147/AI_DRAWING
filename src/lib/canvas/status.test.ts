import { describe, expect, it } from "vitest";
import { statusFromGenerationState, statusFromParts } from "./status";

describe("canvas status helpers", () => {
  it("maps generation states to canvas states", () => {
    expect(statusFromGenerationState("generating")).toBe("running");
    expect(statusFromGenerationState("processing")).toBe("running");
    expect(statusFromGenerationState("completed")).toBe("completed");
    expect(statusFromGenerationState("failed")).toBe("failed");
    expect(statusFromGenerationState("pending")).toBe("idle");
  });

  it("prioritizes failed and stale states", () => {
    expect(statusFromParts({ hasOutput: true, isStale: true })).toBe("failed");
    expect(statusFromParts({ hasRequiredInput: true, hasFailure: true })).toBe("failed");
    expect(statusFromParts({ isGenerating: true })).toBe("running");
    expect(statusFromParts({ hasOutput: true })).toBe("completed");
    expect(statusFromParts({ hasRequiredInput: true })).toBe("ready");
    expect(statusFromParts({})).toBe("idle");
  });
});
