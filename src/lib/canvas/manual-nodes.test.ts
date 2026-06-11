import { describe, expect, it } from "vitest";
import {
  canvasActionsForManualKind,
  canvasKindFromUploadedFile,
  nodeStatusFromPrompt,
} from "./manual-nodes";

describe("manual canvas nodes", () => {
  it("assigns upload and generation actions by node kind", () => {
    expect(canvasActionsForManualKind("text")).toEqual(["generate-script", "extract-characters", "delete-node"]);
    expect(canvasActionsForManualKind("image")).toEqual(["upload-file", "generate-image", "delete-node"]);
    expect(canvasActionsForManualKind("video")).toEqual(["upload-file", "generate-video", "delete-node"]);
    expect(canvasActionsForManualKind("audio")).toEqual(["upload-file", "generate-audio", "delete-node"]);
    expect(canvasActionsForManualKind("file")).toEqual(["upload-file", "import-novel", "delete-node"]);
  });

  it("infers canvas resource kind from uploaded file type and name", () => {
    expect(canvasKindFromUploadedFile({ name: "novel.docx", type: "" })).toBe("text");
    expect(canvasKindFromUploadedFile({ name: "cover.png", type: "image/png" })).toBe("image");
    expect(canvasKindFromUploadedFile({ name: "clip.mp4", type: "video/mp4" })).toBe("video");
    expect(canvasKindFromUploadedFile({ name: "theme.mp3", type: "audio/mpeg" })).toBe("audio");
    expect(canvasKindFromUploadedFile({ name: "archive.zip", type: "application/zip" })).toBe("file");
  });

  it("marks prompt-backed generation nodes ready only when prompt text exists", () => {
    expect(nodeStatusFromPrompt("")).toBe("idle");
    expect(nodeStatusFromPrompt("  wide establishing shot  ")).toBe("ready");
  });
});
