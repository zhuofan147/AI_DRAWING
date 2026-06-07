import type {
  CanvasEdgeData,
  CanvasGraph,
  CanvasLayoutNode,
  CanvasNodeData,
  CanvasViewport,
} from "./types";
import { statusFromGenerationState, statusFromParts } from "./status";

type Character = {
  id: string;
  name: string;
  scope?: string | null;
  episodeId?: string | null;
  referenceImage?: string | null;
  description?: string | null;
};

type ShotAsset = {
  id: string;
  shotId: string;
  type: string;
  fileUrl: string | null;
  status: string;
  isActive: number;
};

type Shot = {
  id: string;
  sequence: number;
  prompt?: string | null;
  videoPrompt?: string | null;
  status?: string | null;
  episodeId?: string | null;
  isStale?: boolean | number | null;
  assets?: ShotAsset[] | null;
};

type Episode = {
  id: string;
  title: string;
  sequence: number;
  status?: string | null;
  finalVideoUrl?: string | null;
};

export type CanvasProjectInput = {
  id: string;
  title: string;
  status?: string | null;
  finalVideoUrl?: string | null;
  episodes?: Episode[];
  characters?: Character[];
  shots?: Shot[];
};

const defaultViewport: CanvasViewport = { x: 0, y: 0, zoom: 1 };

function nodeId(kind: string, id: string) {
  return `${kind}:${id}`;
}

function edge(source: string, target: string, label?: string): CanvasEdgeData {
  return {
    id: `${source}->${target}${label ? `:${label}` : ""}`,
    source,
    target,
    label,
  };
}

function activeAssets(shot: Shot): ShotAsset[] {
  return (shot.assets ?? []).filter((asset) => asset.isActive === 1);
}

export function buildCanvasGraph(
  project: CanvasProjectInput,
  savedLayout: {
    nodes?: CanvasLayoutNode[];
    edges?: CanvasEdgeData[];
    viewport?: CanvasViewport;
  } = {},
): CanvasGraph {
  const nodes: CanvasNodeData[] = [];
  const edges: CanvasEdgeData[] = [];
  const projectNodeId = nodeId("project", project.id);

  nodes.push({
    id: projectNodeId,
    kind: "project",
    entityId: project.id,
    title: project.title,
    subtitle: `${project.episodes?.length ?? 0} episodes`,
    status: statusFromGenerationState(project.status),
    href: `/project/${project.id}/episodes`,
    previewUrl: project.finalVideoUrl ?? null,
    actions: ["open"],
    meta: { finalVideo: Boolean(project.finalVideoUrl) },
  });

  for (const episode of project.episodes ?? []) {
    const id = nodeId("episode", episode.id);
    nodes.push({
      id,
      kind: "episode",
      entityId: episode.id,
      parentId: project.id,
      title: `EP.${String(episode.sequence).padStart(2, "0")}`,
      subtitle: episode.title,
      status: statusFromParts({
        hasRequiredInput: true,
        hasOutput: Boolean(episode.finalVideoUrl),
        isGenerating: episode.status === "processing",
        hasFailure: episode.status === "failed",
      }),
      href: `/project/${project.id}/episodes/${episode.id}/storyboard`,
      previewUrl: episode.finalVideoUrl ?? null,
      actions: ["open", "batch-frames", "batch-video-prompts", "batch-videos", "assemble-video"],
      meta: { sequence: episode.sequence },
    });
    edges.push(edge(projectNodeId, id, "episode"));
  }

  for (const character of project.characters ?? []) {
    const id = nodeId("character", character.id);
    nodes.push({
      id,
      kind: "character",
      entityId: character.id,
      parentId: character.episodeId ?? project.id,
      title: character.name,
      subtitle: character.scope === "guest" ? "客串角色" : "主要角色",
      status: statusFromParts({
        hasRequiredInput: Boolean(character.description),
        hasOutput: Boolean(character.referenceImage),
      }),
      href: `/project/${project.id}/characters`,
      previewUrl: character.referenceImage ?? null,
      actions: ["open"],
      meta: { scope: character.scope ?? "main" },
    });
    edges.push(edge(projectNodeId, id, "character"));
    if (character.episodeId) {
      edges.push(edge(nodeId("episode", character.episodeId), id, "uses"));
    }
  }

  for (const shot of project.shots ?? []) {
    const id = nodeId("shot", shot.id);
    const shotAssets = activeAssets(shot);
    const hasVideo = shotAssets.some((asset) => asset.type.includes("video") && asset.fileUrl);
    const hasFrame = shotAssets.some((asset) => !asset.type.includes("video") && asset.fileUrl);
    nodes.push({
      id,
      kind: "shot",
      entityId: shot.id,
      parentId: shot.episodeId ?? project.id,
      title: `Shot ${shot.sequence}`,
      subtitle: shot.prompt?.slice(0, 72) || "暂无提示词",
      status: statusFromParts({
        hasRequiredInput: Boolean(shot.prompt),
        hasOutput: hasVideo,
        isGenerating: shot.status === "generating",
        hasFailure: shot.status === "failed",
        isStale: Boolean(shot.isStale),
      }),
      href: shot.episodeId
        ? `/project/${project.id}/episodes/${shot.episodeId}/storyboard?shotId=${shot.id}`
        : `/project/${project.id}/storyboard?shotId=${shot.id}`,
      previewUrl: shotAssets.find((asset) => asset.fileUrl)?.fileUrl ?? null,
      actions: ["open", "generate-frame", "generate-video-prompt", "generate-video"],
      meta: {
        sequence: shot.sequence,
        hasFrame,
        hasVideo,
        hasVideoPrompt: Boolean(shot.videoPrompt),
      },
    });
    edges.push(edge(shot.episodeId ? nodeId("episode", shot.episodeId) : projectNodeId, id, "shot"));

    for (const asset of shotAssets) {
      const assetNodeId = nodeId("asset", asset.id);
      nodes.push({
        id: assetNodeId,
        kind: "asset",
        entityId: asset.id,
        parentId: shot.id,
        title: asset.type.replaceAll("_", " "),
        subtitle: asset.status,
        status: statusFromGenerationState(asset.status),
        previewUrl: asset.fileUrl,
        actions: asset.fileUrl ? ["open"] : [],
        meta: { type: asset.type },
      });
      edges.push(edge(id, assetNodeId, "asset"));
    }
  }

  const exportNodeId = nodeId("export", project.id);
  nodes.push({
    id: exportNodeId,
    kind: "export",
    entityId: project.id,
    title: "导出",
    subtitle: project.finalVideoUrl ? "最终视频已生成" : "暂无最终视频",
    status: project.finalVideoUrl ? "completed" : "idle",
    href: `/api/projects/${project.id}/download`,
    previewUrl: project.finalVideoUrl ?? null,
    actions: ["download"],
    meta: {},
  });
  edges.push(edge(projectNodeId, exportNodeId, "export"));

  return {
    nodes,
    edges: mergeEdges(nodes, edges, savedLayout.edges ?? []),
    layoutNodes: mergeLayout(nodes, savedLayout.nodes ?? []),
    viewport: savedLayout.viewport ?? defaultViewport,
  };
}

function mergeLayout(nodes: CanvasNodeData[], saved: CanvasLayoutNode[]): CanvasLayoutNode[] {
  const savedById = new Map(saved.map((item) => [item.id, item]));
  return nodes.map((node, index) => {
    const existing = savedById.get(node.id);
    if (existing) return existing;
    return {
      id: node.id,
      position: {
        x: (index % 5) * 280,
        y: Math.floor(index / 5) * 180,
      },
    };
  });
}

function mergeEdges(
  nodes: CanvasNodeData[],
  generated: CanvasEdgeData[],
  saved: CanvasEdgeData[],
): CanvasEdgeData[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgesById = new Map(generated.map((item) => [item.id, item]));

  for (const item of saved) {
    if (!nodeIds.has(item.source) || !nodeIds.has(item.target)) continue;
    edgesById.set(item.id, item);
  }

  return [...edgesById.values()];
}
