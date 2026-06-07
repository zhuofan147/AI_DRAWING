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
  | "generate-script"
  | "extract-characters"
  | "generate-frame"
  | "generate-video-prompt"
  | "generate-video"
  | "batch-frames"
  | "batch-video-prompts"
  | "batch-videos"
  | "assemble-video"
  | "download";

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
