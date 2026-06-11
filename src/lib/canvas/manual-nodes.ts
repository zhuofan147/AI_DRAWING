import type { CanvasActionKind, CanvasNodeKind, CanvasNodeStatus } from "./types";

const textFileExtensions = new Set(["txt", "docx", "pdf", "md", "markdown"]);

export function canvasActionsForManualKind(kind: CanvasNodeKind): CanvasActionKind[] {
  switch (kind) {
    case "text":
      return ["generate-script", "extract-characters", "delete-node"];
    case "image":
      return ["upload-file", "generate-image", "delete-node"];
    case "video":
      return ["upload-file", "generate-video", "delete-node"];
    case "audio":
      return ["upload-file", "generate-audio", "delete-node"];
    case "file":
      return ["upload-file", "import-novel", "delete-node"];
    case "storyboard_script":
      return ["generate-storyboard", "delete-node"];
    case "director_3d":
      return ["plan-3d-scene", "delete-node"];
    case "panorama_360":
      return ["upload-file", "generate-panorama", "delete-node"];
    case "composition":
      return ["compose-assets", "delete-node"];
    default:
      return [];
  }
}

export function canvasKindFromUploadedFile(file: Pick<File, "name" | "type">): CanvasNodeKind {
  const type = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (textFileExtensions.has(extension)) return "text";

  return "file";
}

export function nodeStatusFromPrompt(prompt: string): CanvasNodeStatus {
  return prompt.trim() ? "ready" : "idle";
}
