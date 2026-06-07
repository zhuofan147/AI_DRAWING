import type { CanvasNodeStatus } from "./types";

export function statusFromGenerationState(status?: string | null): CanvasNodeStatus {
  if (status === "generating" || status === "processing") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "idle";
}

export function statusFromParts(parts: {
  hasRequiredInput?: boolean;
  hasOutput?: boolean;
  isGenerating?: boolean;
  hasFailure?: boolean;
  isStale?: boolean;
}): CanvasNodeStatus {
  if (parts.hasFailure || parts.isStale) return "failed";
  if (parts.isGenerating) return "running";
  if (parts.hasOutput) return "completed";
  if (parts.hasRequiredInput) return "ready";
  return "idle";
}
