import type { CanvasActionKind, CanvasNodeData, CanvasNodeKind } from "./types";

export type CanvasViewKind =
  | "flow"
  | "asset_board"
  | "task_center"
  | "director"
  | "panorama_360"
  | "director_3d"
  | "camera_plan";

export const canvasViewKinds: CanvasViewKind[] = [
  "flow",
  "asset_board",
  "task_center",
  "director",
  "panorama_360",
  "director_3d",
  "camera_plan",
];

const generationActions = new Set<CanvasActionKind>([
  "generate-frame",
  "generate-video-prompt",
  "generate-video",
  "batch-frames",
  "batch-video-prompts",
  "batch-videos",
  "assemble-video",
]);

const directorKinds = new Set<CanvasNodeKind>(["episode", "shot", "asset"]);
const director3dKinds = new Set<CanvasNodeKind>(["episode", "shot", "character", "asset"]);
const cameraPlanKinds = new Set<CanvasNodeKind>(["episode", "shot"]);

function textIncludesPanorama(value?: string | number | boolean | null) {
  return String(value ?? "")
    .toLowerCase()
    .match(/(panorama|360|全景)/);
}

function isPanoramaAsset(node: CanvasNodeData) {
  if (node.kind !== "asset") return false;
  return Boolean(
    textIncludesPanorama(node.title) ||
      textIncludesPanorama(node.subtitle) ||
      textIncludesPanorama(node.meta.type),
  );
}

export function isNodeVisibleInCanvasView(node: CanvasNodeData, viewKind: CanvasViewKind) {
  if (viewKind === "flow") return true;
  if (viewKind === "asset_board") {
    return node.kind === "asset" || (node.kind === "character" && Boolean(node.previewUrl));
  }
  if (viewKind === "task_center") {
    return node.status === "running" ||
      node.status === "failed" ||
      node.actions.some((action) => generationActions.has(action));
  }
  if (viewKind === "director") return directorKinds.has(node.kind);
  if (viewKind === "panorama_360") return isPanoramaAsset(node);
  if (viewKind === "director_3d") return director3dKinds.has(node.kind);
  if (viewKind === "camera_plan") return cameraPlanKinds.has(node.kind);
  return false;
}
