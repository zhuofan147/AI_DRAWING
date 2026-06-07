"use client";

import { useTranslations } from "next-intl";
import {
  Download,
  ExternalLink,
  Film,
  ImageIcon,
  Play,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { CanvasActionKind, CanvasNodeData } from "@/lib/canvas/types";

interface CanvasInspectorProps {
  node: CanvasNodeData | null;
  onAction: (action: CanvasActionKind, node: CanvasNodeData) => void;
  onNodeContentChange?: (nodeId: string, content: string) => void;
}

const actionIcons: Partial<Record<CanvasActionKind, typeof Wand2>> = {
  open: ExternalLink,
  "generate-script": Sparkles,
  "extract-characters": Sparkles,
  "generate-frame": ImageIcon,
  "generate-video-prompt": Sparkles,
  "generate-video": Play,
  "batch-frames": ImageIcon,
  "batch-video-prompts": Sparkles,
  "batch-videos": Play,
  "assemble-video": Film,
  download: Download,
};

const statusVariant = {
  idle: "outline",
  ready: "warning",
  running: "default",
  completed: "success",
  failed: "destructive",
} as const;

export function CanvasInspector({ node, onAction, onNodeContentChange }: CanvasInspectorProps) {
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
          <p className="text-xs font-semibold uppercase text-[--text-muted]">{t("actionsTitle")}</p>
          {node.actions.map((action) => {
            const Icon = actionIcons[action] ?? Wand2;
            return (
              <Button
                key={action}
                variant={action === "open" || action === "download" ? "outline" : "default"}
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
