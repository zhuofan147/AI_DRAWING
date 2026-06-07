import { describe, expect, it } from "vitest";
import { buildGenerateRequest } from "./actions";

describe("buildGenerateRequest", () => {
  it("maps a shot frame action to the existing generate API shape", () => {
    expect(
      buildGenerateRequest({
        action: "generate-frame",
        shotId: "shot-1",
        episodeId: "episode-1",
        versionId: "version-1",
        ratio: "16:9",
        modelConfig: { image: { provider: "mock" } },
      }),
    ).toEqual({
      action: "single_frame_generate",
      payload: {
        shotId: "shot-1",
        versionId: "version-1",
        ratio: "16:9",
      },
      modelConfig: { image: { provider: "mock" } },
      episodeId: "episode-1",
    });
  });

  it("maps batch videos to the existing batch action", () => {
    const request = buildGenerateRequest({
      action: "batch-videos",
      episodeId: "episode-1",
      modelConfig: {},
      overwrite: false,
    });

    expect(request.action).toBe("batch_video_generate");
    expect(request.payload).toEqual({ overwrite: false });
  });

  it("uses reference video actions when the project is in reference mode", () => {
    const request = buildGenerateRequest({
      action: "generate-video",
      shotId: "shot-1",
      ratio: "9:16",
      generationMode: "reference",
      modelConfig: {},
    });

    expect(request.action).toBe("single_reference_video");
  });
});
