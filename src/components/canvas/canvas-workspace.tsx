"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "reactflow";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { buildGenerateRequest } from "@/lib/canvas/actions";
import { buildCanvasGraph } from "@/lib/canvas/mapper";
import { isNodeVisibleInCanvasView, type CanvasViewKind } from "@/lib/canvas/views";
import type {
  CanvasActionKind,
  CanvasEdgeData,
  CanvasGraph,
  CanvasLayoutNode,
  CanvasNodeData,
  CanvasViewport,
} from "@/lib/canvas/types";
import { useModelGuard } from "@/hooks/use-model-guard";
import { useModelStore } from "@/stores/model-store";
import { useProjectStore } from "@/stores/project-store";
import { CanvasInspector } from "./canvas-inspector";
import { CanvasNode } from "./canvas-node";
import { CanvasResourceRail } from "./canvas-resource-rail";
import {
  CanvasToolbar,
  type CanvasKindFilter,
  type CanvasStatusFilter,
} from "./canvas-toolbar";

type FlowNodeData = CanvasNodeData & {
  onAction?: (action: CanvasActionKind, node: CanvasNodeData) => void;
};

type SavedLayout = {
  nodes: CanvasLayoutNode[];
  edges: CanvasEdgeData[];
  viewport: CanvasViewport;
};

const nodeTypes = { canvas: CanvasNode };

function applyDefaultLayout(nodes: CanvasNodeData[]): CanvasLayoutNode[] {
  const columnByKind: Record<string, number> = {
    project: 0,
    episode: 1,
    character: 2,
    shot: 3,
    asset: 4,
    export: 5,
    action: 5,
  };
  const rowByKind = new Map<string, number>();

  return nodes.map((node) => {
    const column = columnByKind[node.kind] ?? 0;
    const row = rowByKind.get(node.kind) ?? 0;
    rowByKind.set(node.kind, row + 1);
    return {
      id: node.id,
      position: {
        x: column * 320,
        y: row * 190,
      },
    };
  });
}

function flowEdge(edge: CanvasEdgeData): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: edge.label !== "manual",
    style: {
      stroke: edge.label === "manual" ? "var(--primary)" : "var(--border-hover)",
      strokeWidth: edge.label === "manual" ? 2 : 1.5,
    },
    labelStyle: { fill: "var(--text-muted)", fontSize: 11 },
  };
}

function isNodeVisible(
  node: CanvasNodeData,
  viewKind: CanvasViewKind,
  kindFilter: CanvasKindFilter,
  statusFilter: CanvasStatusFilter,
  search: string,
) {
  if (!isNodeVisibleInCanvasView(node, viewKind)) return false;
  if (kindFilter !== "all" && node.kind !== kindFilter) return false;
  if (statusFilter !== "all" && node.status !== statusFilter) return false;

  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  return `${node.title} ${node.subtitle} ${node.id}`.toLowerCase().includes(normalized);
}

export function CanvasWorkspace({ projectId }: { projectId: string }) {
  const t = useTranslations("project.canvas");
  const locale = useLocale();
  const router = useRouter();
  const project = useProjectStore((state) => state.project);
  const loadingProject = useProjectStore((state) => state.loading);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const getModelConfig = useModelStore((state) => state.getModelConfig);
  const imageGuard = useModelGuard("image");
  const textGuard = useModelGuard("text");
  const videoGuard = useModelGuard("video");

  const [layout, setLayout] = useState<SavedLayout | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewKind, setViewKind] = useState<CanvasViewKind>("flow");
  const [kindFilter, setKindFilter] = useState<CanvasKindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<CanvasStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [overwrite, setOverwrite] = useState(false);
  const instanceRef = useRef<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!project || project.id !== projectId) {
      fetchProject(projectId);
    }
  }, [fetchProject, project, projectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      setLayoutLoading(true);
      try {
        const response = await apiFetch(`/api/projects/${projectId}/canvas`);
        const data = await response.json() as SavedLayout;
        if (!cancelled) setLayout(data);
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error(t("layoutLoadFailed"));
      } finally {
        if (!cancelled) setLayoutLoading(false);
      }
    }

    loadLayout();
    return () => {
      cancelled = true;
    };
  }, [projectId, t]);

  const graph = useMemo<CanvasGraph | null>(() => {
    if (!project || !layout) return null;
    return buildCanvasGraph(project, layout);
  }, [layout, project]);

  const graphNodesById = useMemo(() => {
    return new Map(graph?.nodes.map((node) => [node.id, node]) ?? []);
  }, [graph]);

  const viewNodes = useMemo(() => {
    return graph?.nodes.filter((node) => isNodeVisibleInCanvasView(node, viewKind)) ?? [];
  }, [graph, viewKind]);

  const selectedNode = selectedNodeId ? graphNodesById.get(selectedNodeId) ?? null : null;

  const handleAction = useCallback(async (action: CanvasActionKind, node: CanvasNodeData) => {
    if (action === "open" || action === "download") {
      const target = node.href ?? node.previewUrl;
      if (!target) return;
      if (target.startsWith("/api") || target.startsWith("http")) {
        window.open(target, "_blank", "noopener,noreferrer");
      } else {
        router.push(`/${locale}${target}`);
      }
      return;
    }

    if (action === "generate-frame" || action === "batch-frames") {
      if (!imageGuard()) return;
    }
    if (action === "generate-video-prompt" || action === "batch-video-prompts") {
      if (!textGuard()) return;
    }
    if (action === "generate-video" || action === "batch-videos") {
      if (!videoGuard()) return;
    }

    if (!project) return;

    const episodeId =
      node.kind === "episode"
        ? node.entityId
        : node.kind === "shot" && node.parentId !== project.id
          ? node.parentId
          : undefined;

    const requestBody = buildGenerateRequest({
      action,
      shotId: node.kind === "shot" ? node.entityId : undefined,
      episodeId,
      versionId: project.versions?.[0]?.id,
      ratio,
      overwrite,
      generationMode: project.generationMode,
      modelConfig: getModelConfig(),
    });

    setRunningAction(`${action}:${node.id}`);
    try {
      await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      toast.success(t("actionQueued"));
      await fetchProject(project.id);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setRunningAction(null);
    }
  }, [
    fetchProject,
    getModelConfig,
    imageGuard,
    locale,
    overwrite,
    project,
    ratio,
    router,
    t,
    textGuard,
    videoGuard,
  ]);

  useEffect(() => {
    if (!graph) return;
    const layoutById = new Map(graph.layoutNodes.map((item) => [item.id, item]));
    setNodes(
      graph.nodes.map((node) => ({
        id: node.id,
        type: "canvas",
        position: layoutById.get(node.id)?.position ?? { x: 0, y: 0 },
        data: {
          ...node,
          onAction: handleAction,
        },
      })),
    );
    setEdges(graph.edges.map(flowEdge));

    window.requestAnimationFrame(() => {
      instanceRef.current?.setViewport(graph.viewport, { duration: 200 });
    });
  }, [graph, handleAction, setEdges, setNodes]);

  useEffect(() => {
    if (!graph) return;
    const hiddenIds = new Set(
      graph.nodes
        .filter((node) => !isNodeVisible(node, viewKind, kindFilter, statusFilter, search))
        .map((node) => node.id),
    );

    setNodes((items) =>
      items.map((item) => ({
        ...item,
        hidden: hiddenIds.has(item.id),
      })),
    );
    setEdges((items) =>
      items.map((item) => ({
        ...item,
        hidden: hiddenIds.has(item.source) || hiddenIds.has(item.target),
      })),
    );
  }, [graph, kindFilter, search, setEdges, setNodes, statusFilter, viewKind]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    setEdges((items) =>
      addEdge(
        {
          ...connection,
          id: `manual:${connection.source}->${connection.target}:${Date.now()}`,
          label: "manual",
          type: "smoothstep",
          animated: false,
          style: { stroke: "var(--primary)", strokeWidth: 2 },
        },
        items,
      ),
    );
  }, [setEdges]);

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId(id);
    setNodes((items) => items.map((node) => ({ ...node, selected: node.id === id })));
    const item = nodes.find((node) => node.id === id);
    if (item) {
      instanceRef.current?.setCenter(
        item.position.x + 125,
        item.position.y + 80,
        { duration: 300, zoom: 1.05 },
      );
    }
  }, [nodes, setNodes]);

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    try {
      const payload = {
        nodes: nodes.map((node) => ({
          id: node.id,
          position: node.position,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: typeof edge.label === "string" ? edge.label : undefined,
        })),
        viewport: instanceRef.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 },
      };
      const response = await apiFetch(`/api/projects/${project.id}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await response.json() as SavedLayout;
      setLayout(saved);
      toast.success(t("layoutSaved"));
    } catch (error) {
      console.error(error);
      toast.error(t("layoutSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchProject(projectId);
      toast.success(t("refreshed"));
    } catch (error) {
      console.error(error);
      toast.error(t("refreshFailed"));
    } finally {
      setRefreshing(false);
    }
  }

  function handleAutoLayout() {
    if (!graph) return;
    const nextLayout = applyDefaultLayout(graph.nodes);
    const nextById = new Map(nextLayout.map((item) => [item.id, item.position]));
    setNodes((items) =>
      items.map((node) => ({
        ...node,
        position: nextById.get(node.id) ?? node.position,
      })),
    );
    window.requestAnimationFrame(() => instanceRef.current?.fitView({ padding: 0.2, duration: 300 }));
  }

  if (loadingProject || layoutLoading || !project || !graph) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[--surface]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-[--text-muted]">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[640px] flex-1 overflow-hidden bg-[--surface]">
      <CanvasResourceRail
        nodes={viewNodes}
        selectedId={selectedNodeId}
        search={search}
        onSearchChange={setSearch}
        onSelect={handleSelectNode}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <CanvasToolbar
          locale={locale}
          projectId={projectId}
          viewKind={viewKind}
          kindFilter={kindFilter}
          statusFilter={statusFilter}
          ratio={ratio}
          overwrite={overwrite}
          saving={saving}
          refreshing={refreshing}
          onViewKindChange={setViewKind}
          onKindFilterChange={setKindFilter}
          onStatusFilterChange={setStatusFilter}
          onRatioChange={setRatio}
          onOverwriteChange={setOverwrite}
          onAutoLayout={handleAutoLayout}
          onRefresh={handleRefresh}
          onSave={handleSave}
        />
        <div className="relative min-h-0 flex-1">
          {runningAction && (
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[--border-subtle] bg-white px-3 py-2 text-xs text-[--text-secondary] shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {t("runningAction")}
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onInit={(instance) => {
              instanceRef.current = instance;
            }}
            onNodeClick={(_, node: Node<FlowNodeData>) => setSelectedNodeId(node.id)}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-[--surface]"
          >
            <Background color="var(--border-hover)" gap={28} size={1} />
            <Controls className="!border !border-[--border-subtle] !bg-white !shadow-sm" />
            <MiniMap
              nodeColor={(node) => node.hidden ? "#E8E8E3" : "#E8553A"}
              maskColor="rgba(250, 250, 248, 0.72)"
              className="!border !border-[--border-subtle] !bg-white !shadow-sm"
            />
          </ReactFlow>
        </div>
      </main>

      <CanvasInspector node={selectedNode} onAction={handleAction} />
    </div>
  );
}
