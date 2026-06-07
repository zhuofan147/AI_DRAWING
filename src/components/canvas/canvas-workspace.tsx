"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
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
import {
  FileUp,
  Film,
  Globe2,
  ImageIcon,
  LayoutPanelTop,
  Loader2,
  Music,
  NotebookText,
  PenLine,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { buildGenerateRequest, type CanvasGenerateInput } from "@/lib/canvas/actions";
import { buildCanvasGraph } from "@/lib/canvas/mapper";
import { isNodeVisibleInCanvasView, type CanvasViewKind } from "@/lib/canvas/views";
import type {
  CanvasActionKind,
  CanvasEdgeData,
  CanvasGraph,
  CanvasLayoutNode,
  CanvasNodeData,
  CanvasNodeKind,
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

type RoutableCanvasAction = CanvasGenerateInput["action"];

type AddNodeOption = {
  kind: CanvasNodeKind;
  labelKey: string;
  sectionKey: string;
  icon: typeof NotebookText;
  beta?: boolean;
};

const addNodeOptions: AddNodeOption[] = [
  { kind: "text", labelKey: "addNodes.text", sectionKey: "addSections.generate", icon: PenLine },
  { kind: "image", labelKey: "addNodes.image", sectionKey: "addSections.generate", icon: ImageIcon },
  { kind: "video", labelKey: "addNodes.video", sectionKey: "addSections.generate", icon: Film },
  { kind: "audio", labelKey: "addNodes.audio", sectionKey: "addSections.generate", icon: Music },
  { kind: "director_3d", labelKey: "addNodes.director3d", sectionKey: "addSections.function", icon: Globe2 },
  { kind: "panorama_360", labelKey: "addNodes.panorama360", sectionKey: "addSections.function", icon: Globe2 },
  { kind: "storyboard_script", labelKey: "addNodes.storyboardScript", sectionKey: "addSections.function", icon: Table2, beta: true },
  { kind: "composition", labelKey: "addNodes.composition", sectionKey: "addSections.function", icon: LayoutPanelTop },
  { kind: "file", labelKey: "addNodes.uploadFile", sectionKey: "addSections.resource", icon: FileUp },
];

const manualNodeLabelKeyByKind: Partial<Record<CanvasNodeKind, string>> = Object.fromEntries(
  addNodeOptions.map((option) => [option.kind, option.labelKey]),
);

const routableCanvasActions = new Set<CanvasActionKind>([
  "generate-frame",
  "generate-video-prompt",
  "generate-video",
  "batch-frames",
  "batch-video-prompts",
  "batch-videos",
  "assemble-video",
]);

function isRoutableCanvasAction(action: CanvasActionKind): action is RoutableCanvasAction {
  return routableCanvasActions.has(action);
}

function applyDefaultLayout(nodes: CanvasNodeData[]): CanvasLayoutNode[] {
  const columnByKind: Record<string, number> = {
    project: 0,
    text: 1,
    episode: 1,
    character: 2,
    shot: 3,
    asset: 4,
    export: 5,
    action: 5,
    image: 4,
    video: 4,
    audio: 4,
    note: 1,
    storyboard_script: 2,
    director_3d: 3,
    panorama_360: 3,
    composition: 3,
    file: 4,
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
  const [addMenu, setAddMenu] = useState<{
    screen: { x: number; y: number };
    flow: { x: number; y: number };
  } | null>(null);
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);

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

  const viewNodes = useMemo(() => {
    return nodes
      .map((node) => node.data)
      .filter((node) => isNodeVisibleInCanvasView(node, viewKind));
  }, [nodes, viewKind]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId)?.data ?? null;
  }, [nodes, selectedNodeId]);

  const updateManualNodeContent = useCallback((nodeId: string, content: string) => {
    setNodes((items) =>
      items.map((item) =>
        item.id === nodeId
          ? {
              ...item,
              data: {
                ...item.data,
                subtitle: content.trim() ? `${content.trim().length} 字` : t("textNodeEmpty"),
                status: content.trim() ? "ready" : "idle",
                meta: {
                  ...item.data.meta,
                  content,
                },
              },
            }
          : item,
      ),
    );
  }, [setNodes, t]);

  const handleAction = useCallback(async (action: CanvasActionKind, node: CanvasNodeData) => {
    if ((action === "generate-script" || action === "extract-characters") && node.kind === "text") {
      const content = String(node.meta.content ?? "").trim();
      if (!content) {
        toast.error(t("textNodeContentRequired"));
        return;
      }
      if (!textGuard()) return;

      setRunningAction(`${action}:${node.id}`);
      try {
        if (action === "generate-script") {
          const response = await apiFetch(`/api/projects/${projectId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "script_generate",
              payload: { idea: content },
              modelConfig: getModelConfig(),
            }),
          });
          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.error ?? t("actionFailed"));
          }
          await response.text();
          toast.success(t("scriptGenerated"));
        } else {
          await apiFetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script: content }),
          });
          const response = await apiFetch(`/api/projects/${projectId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "character_extract",
              modelConfig: getModelConfig(),
            }),
          });
          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.error ?? t("actionFailed"));
          }
          await response.text();
          toast.success(t("charactersExtracted"));
        }
        await fetchProject(projectId);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : t("actionFailed"));
      } finally {
        setRunningAction(null);
      }
      return;
    }

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
    if (!isRoutableCanvasAction(action)) return;

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
    projectId,
    ratio,
    router,
    t,
    textGuard,
    videoGuard,
  ]);

  const createManualNode = useCallback((kind: CanvasNodeKind, position: { x: number; y: number }) => {
    const id = `manual:${kind}:${Date.now()}`;
    const content = kind === "text" ? "" : undefined;
    const data: FlowNodeData = {
      id,
      kind,
      entityId: id,
      title: t(manualNodeLabelKeyByKind[kind] ?? `kinds.${kind}`),
      subtitle: kind === "text" ? t("textNodeEmpty") : t("manualNodeDraft"),
      status: "idle",
      previewUrl: null,
      actions: kind === "text" ? ["generate-script", "extract-characters"] : [],
      meta: {
        source: "manual",
        ...(content !== undefined && { content }),
      },
      onAction: handleAction,
    };

    setNodes((items) => [
      ...items.map((item) => ({ ...item, selected: false })),
      {
        id,
        type: "canvas",
        position,
        data,
        selected: true,
      },
    ]);
    setSelectedNodeId(id);
    setAddMenu(null);
  }, [handleAction, setNodes, t]);

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
      nodes
        .filter((node) => !isNodeVisible(node.data, viewKind, kindFilter, statusFilter, search))
        .map((node) => node.id),
    );

    setNodes((items) =>
      items.every((item) => item.hidden === hiddenIds.has(item.id))
        ? items
        : items.map((item) => ({
          ...item,
          hidden: hiddenIds.has(item.id),
        })),
    );
    setEdges((items) =>
      items.every((item) => item.hidden === (hiddenIds.has(item.source) || hiddenIds.has(item.target)))
        ? items
        : items.map((item) => ({
          ...item,
          hidden: hiddenIds.has(item.source) || hiddenIds.has(item.target),
        })),
    );
  }, [graph, kindFilter, nodes, search, setEdges, setNodes, statusFilter, viewKind]);

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

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<Element>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".react-flow__node, .react-flow__controls, .react-flow__minimap")) return;

    const bounds = flowWrapperRef.current?.getBoundingClientRect();
    const viewport = instanceRef.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 };
    const localX = bounds ? event.clientX - bounds.left : event.clientX;
    const localY = bounds ? event.clientY - bounds.top : event.clientY;
    setAddMenu({
      screen: { x: localX, y: localY },
      flow: {
        x: (localX - viewport.x) / viewport.zoom,
        y: (localY - viewport.y) / viewport.zoom,
      },
    });
  }, []);

  const handlePaneClick = useCallback((event: ReactMouseEvent<Element>) => {
    if (event.detail >= 2) {
      handleCanvasDoubleClick(event);
      return;
    }
    setAddMenu(null);
  }, [handleCanvasDoubleClick]);

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
          ...(node.id.startsWith("manual:") && {
            data: {
              ...node.data,
              onAction: undefined,
            },
          }),
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
        <div ref={flowWrapperRef} className="relative min-h-0 flex-1">
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
            onPaneClick={handlePaneClick}
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
          {addMenu && (
            <div
              className="absolute z-30 w-72 overflow-hidden rounded-2xl border border-[--border-subtle] bg-[--panel] p-4 shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]"
              style={{
                left: Math.min(addMenu.screen.x, Math.max(16, (flowWrapperRef.current?.clientWidth ?? 320) - 304)),
                top: Math.min(addMenu.screen.y, Math.max(16, (flowWrapperRef.current?.clientHeight ?? 420) - 520)),
              }}
            >
              {["addSections.generate", "addSections.function", "addSections.resource"].map((section) => (
                <div key={section} className="mb-3 last:mb-0">
                  <div className="mb-2 flex items-center gap-3">
                    <p className="shrink-0 text-sm font-semibold text-[--text-muted]">{t(section)}</p>
                    <div className="h-px flex-1 bg-[--border-subtle]" />
                  </div>
                  <div className="space-y-1">
                    {addNodeOptions
                      .filter((option) => option.sectionKey === section)
                      .map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.kind}
                            type="button"
                            className="flex h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold text-[--text-primary] transition-colors hover:bg-[--surface-hover]"
                            onClick={() => createManualNode(option.kind, addMenu.flow)}
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--surface] text-[--text-secondary]">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span>{t(option.labelKey)}</span>
                            {option.beta && (
                              <span className="rounded-full border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary">
                                BETA
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CanvasInspector
        node={selectedNode}
        onAction={handleAction}
        onNodeContentChange={updateManualNodeContent}
      />
    </div>
  );
}
