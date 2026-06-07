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
  "generate-script",
  "extract-characters",
  "generate-frame",
  "generate-video-prompt",
  "generate-video",
  "batch-frames",
  "batch-video-prompts",
  "batch-videos",
  "assemble-video",
]);

const assetBoardKinds = new Set<CanvasNodeKind>(["asset", "image", "video", "audio", "file"]);
const directorKinds = new Set<CanvasNodeKind>(["episode", "shot", "asset", "storyboard_script"]);
const director3dKinds = new Set<CanvasNodeKind>(["episode", "shot", "character", "asset", "director_3d"]);
const cameraPlanKinds = new Set<CanvasNodeKind>(["episode", "shot", "composition"]);

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
    return assetBoardKinds.has(node.kind) || (node.kind === "character" && Boolean(node.previewUrl));
  }
  if (viewKind === "task_center") {
    return node.status === "running" ||
      node.status === "failed" ||
      node.actions.some((action) => generationActions.has(action));
  }
  if (viewKind === "director") return directorKinds.has(node.kind);
  if (viewKind === "panorama_360") return node.kind === "panorama_360" || isPanoramaAsset(node);
  if (viewKind === "director_3d") return director3dKinds.has(node.kind);
  if (viewKind === "camera_plan") return cameraPlanKinds.has(node.kind);
  return false;
}
