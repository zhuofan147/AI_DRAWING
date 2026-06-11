"use client";

import { useTranslations } from "next-intl";
import {
  Download,
  ExternalLink,
  Film,
  ImageIcon,
  Play,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { InlineModelPicker } from "@/components/editor/model-selector";
import type { CanvasActionKind, CanvasNodeData } from "@/lib/canvas/types";
import type { Capability, ModelRef } from "@/stores/model-store";

interface CanvasInspectorProps {
  node: CanvasNodeData | null;
  onAction: (action: CanvasActionKind, node: CanvasNodeData) => void;
  onNodeContentChange?: (nodeId: string, content: string) => void;
  onNodeMetaChange?: (nodeId: string, patch: Record<string, string | number | boolean | null>) => void;
  onNodeModelChange?: (nodeId: string, capability: Capability, ref: ModelRef) => void;
}

const actionIcons: Partial<Record<CanvasActionKind, typeof Wand2>> = {
  open: ExternalLink,
  "upload-file": Upload,
  "import-novel": Sparkles,
  "generate-script": Sparkles,
  "extract-characters": Sparkles,
  "generate-image": ImageIcon,
  "generate-frame": ImageIcon,
  "generate-video-prompt": Sparkles,
  "generate-video": Play,
  "generate-audio": Play,
  "generate-storyboard": Sparkles,
  "plan-3d-scene": Wand2,
  "generate-panorama": ImageIcon,
  "compose-assets": Sparkles,
  "batch-frames": ImageIcon,
  "batch-video-prompts": Sparkles,
  "batch-videos": Play,
  "assemble-video": Film,
  download: Download,
  "delete-node": Trash2,
};

const statusVariant = {
  idle: "outline",
  ready: "warning",
  running: "default",
  completed: "success",
  failed: "destructive",
} as const;

const modelMetaKeys: Record<Capability, { providerId: string; modelId: string }> = {
  text: { providerId: "textModelProviderId", modelId: "textModelId" },
  image: { providerId: "imageModelProviderId", modelId: "imageModelId" },
  video: { providerId: "videoModelProviderId", modelId: "videoModelId" },
};

function nodeModelRef(node: CanvasNodeData, capability: Capability): ModelRef | null {
  const keys = modelMetaKeys[capability];
  const providerId = node.meta[keys.providerId];
  const modelId = node.meta[keys.modelId];
  if (typeof providerId !== "string" || typeof modelId !== "string") return null;
  if (!providerId || !modelId) return null;
  return { providerId, modelId };
}

function nodeModelCapabilities(node: CanvasNodeData): Capability[] {
  if (!node.id.startsWith("manual:")) return [];
  if (node.kind === "text" || node.kind === "file" || node.kind === "storyboard_script") return ["text"];
  if (node.kind === "image" || node.kind === "panorama_360") return ["image"];
  if (node.kind === "video") return ["video"];
  return [];
}

export function CanvasInspector({
  node,
  onAction,
  onNodeContentChange,
  onNodeMetaChange,
  onNodeModelChange,
}: CanvasInspectorProps) {
  const t = useTranslations("project.canvas");

  if (!node) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-[--border-subtle] bg-white lg:flex lg:flex-col">
        <div className="border-b border-[--border-subtle] px-4 py-3">
          <p className="text-sm font-semibold text-[--text-primary]">{t("inspector")}</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[--text-muted]">
          {t("emptySelection")}
        </div>
      </aside>
    );
  }

  const modelCapabilities = nodeModelCapabilities(node);

  return (
    <aside className="hidden w-80 shrink-0 border-l border-[--border-subtle] bg-white lg:flex lg:flex-col">
      <div className="border-b border-[--border-subtle] px-4 py-3">
        <p className="text-sm font-semibold text-[--text-primary]">{t("inspector")}</p>
        <p className="mt-1 truncate text-xs text-[--text-muted]">{node.id}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-lg border border-[--border-subtle] bg-white">
          {node.previewUrl ? (
            node.previewUrl.match(/\.(mp4|mov|webm|m4v)(\?|$)/i) ? (
              <video
                src={node.previewUrl}
                controls
                className="aspect-video w-full bg-black object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.previewUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
            )
          ) : (
            <div className="flex aspect-video items-center justify-center bg-[--surface] text-[--text-muted]">
              {t("noPreview")}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[node.status]}>{t(`statuses.${node.status}`)}</Badge>
            <Badge variant="outline">{t(`kinds.${node.kind}`)}</Badge>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[--text-primary]">{node.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[--text-secondary]">{node.subtitle}</p>
        </div>

        {modelCapabilities.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase text-[--text-muted]">{t("nodeModel")}</p>
            <div className="space-y-2 rounded-lg border border-[--border-subtle] bg-[--surface]/60 p-3">
              {modelCapabilities.map((capability) => (
                <InlineModelPicker
                  key={capability}
                  capability={capability}
                  value={nodeModelRef(node, capability)}
                  onChange={(ref) => onNodeModelChange?.(node.id, capability, ref)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {node.kind === "text" && (
            <div className="mb-5 space-y-2">
              <p className="text-xs font-semibold uppercase text-[--text-muted]">{t("nodeContent")}</p>
              <Textarea
                value={String(node.meta.content ?? "")}
                onChange={(event) => onNodeContentChange?.(node.id, event.target.value)}
                placeholder={t("textNodePlaceholder")}
                className="min-h-48 resize-y rounded-lg text-sm leading-6"
              />
            </div>
          )}
          {["file", "image", "video", "audio", "storyboard_script", "director_3d", "panorama_360", "composition"].includes(node.kind) && (
            <div className="mb-5 space-y-3">
              <p className="text-xs font-semibold uppercase text-[--text-muted]">{t("operationPanel")}</p>
              {["image", "video", "audio", "storyboard_script", "panorama_360"].includes(node.kind) && (
                <Textarea
                  value={String(node.meta.prompt ?? node.meta.content ?? "")}
                  onChange={(event) => onNodeMetaChange?.(node.id, { prompt: event.target.value })}
                  placeholder={t(`panelPlaceholders.${node.kind}`)}
                  className="min-h-28 resize-y rounded-lg text-sm leading-6"
                />
              )}
              {node.kind === "director_3d" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={String(node.meta.camera ?? "")}
                    onChange={(event) => onNodeMetaChange?.(node.id, { camera: event.target.value })}
                    placeholder={t("panelFields.camera")}
                    className="rounded-lg"
                  />
                  <Input
                    value={String(node.meta.lens ?? "")}
                    onChange={(event) => onNodeMetaChange?.(node.id, { lens: event.target.value })}
                    placeholder={t("panelFields.lens")}
                    className="rounded-lg"
                  />
                  <Input
                    value={String(node.meta.lighting ?? "")}
                    onChange={(event) => onNodeMetaChange?.(node.id, { lighting: event.target.value })}
                    placeholder={t("panelFields.lighting")}
                    className="col-span-2 rounded-lg"
                  />
                </div>
              )}
              {node.kind === "composition" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={String(node.meta.layout ?? "")}
                    onChange={(event) => onNodeMetaChange?.(node.id, { layout: event.target.value })}
                    placeholder={t("panelFields.layout")}
                    className="rounded-lg"
                  />
                  <Input
                    value={String(node.meta.gap ?? "")}
                    onChange={(event) => onNodeMetaChange?.(node.id, { gap: event.target.value })}
                    placeholder={t("panelFields.gap")}
                    className="rounded-lg"
                  />
                </div>
              )}
              {node.kind === "file" && (
                <p className="rounded-lg bg-[--surface] px-3 py-2 text-xs leading-5 text-[--text-muted]">
                  {t("filePanelHint")}
                </p>
              )}
            </div>
          )}
          <p className="text-xs font-semibold uppercase text-[--text-muted]">{t("actionsTitle")}</p>
          {node.actions.map((action) => {
            const Icon = actionIcons[action] ?? Wand2;
            return (
              <Button
                key={action}
                variant={
                  action === "delete-node"
                    ? "destructive"
                    : action === "open" || action === "download"
                      ? "outline"
                      : "default"
                }
                className="w-full justify-start rounded-lg"
                onClick={() => onAction(action, node)}
              >
                <Icon className="h-4 w-4" />
                {t(`actions.${action}`)}
              </Button>
            );
          })}
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase text-[--text-muted]">{t("metaTitle")}</p>
          {Object.entries(node.meta).length === 0 ? (
            <p className="rounded-lg bg-[--surface] px-3 py-2 text-xs text-[--text-muted]">
              {t("emptyMeta")}
            </p>
          ) : (
            Object.entries(node.meta).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg bg-[--surface] px-3 py-2 text-xs"
              >
                <span className="text-[--text-muted]">{key}</span>
                <span className="truncate text-[--text-secondary]">{String(value ?? "-")}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
