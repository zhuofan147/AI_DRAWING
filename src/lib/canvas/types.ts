export type CanvasNodeKind =
  | "project"
  | "episode"
  | "character"
  | "shot"
  | "asset"
  | "text"
  | "image"
  | "video"
  | "audio"
  | "note"
  | "storyboard_script"
  | "director_3d"
  | "panorama_360"
  | "composition"
  | "file"
  | "action"
  | "export";

export type CanvasNodeStatus =
  | "idle"
  | "ready"
  | "running"
  | "completed"
  | "failed";

export type CanvasActionKind =
  | "open"
  | "upload-file"
  | "import-novel"
  | "generate-script"
  | "extract-characters"
  | "generate-image"
  | "generate-frame"
  | "generate-video-prompt"
  | "generate-video"
  | "generate-audio"
  | "generate-storyboard"
  | "plan-3d-scene"
  | "generate-panorama"
  | "compose-assets"
  | "batch-frames"
  | "batch-video-prompts"
  | "batch-videos"
  | "assemble-video"
  | "download"
  | "delete-node";

export interface CanvasNodeData {
  id: string;
  kind: CanvasNodeKind;
  entityId: string;
  parentId?: string;
  title: string;
  subtitle: string;
  status: CanvasNodeStatus;
  href?: string;
  previewUrl?: string | null;
  actions: CanvasActionKind[];
  meta: Record<string, string | number | boolean | null | undefined>;
}

export interface CanvasEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CanvasLayoutNode {
  id: string;
  position: { x: number; y: number };
  collapsed?: boolean;
  hidden?: boolean;
  data?: CanvasNodeData;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasGraph {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  layoutNodes: CanvasLayoutNode[];
  viewport: CanvasViewport;
}
