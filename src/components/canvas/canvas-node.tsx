"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslations } from "next-intl";
import {
  Box,
  Download,
  ExternalLink,
  Film,
  ImageIcon,
  Layers,
  Music,
  NotebookText,
  Play,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasActionKind, CanvasNodeData, CanvasNodeKind } from "@/lib/canvas/types";

type NodeData = CanvasNodeData & {
  onAction?: (action: CanvasActionKind, node: CanvasNodeData) => void;
};

const kindIcons: Record<CanvasNodeKind, typeof Box> = {
  project: Layers,
  episode: Film,
  character: UserRound,
  shot: ImageIcon,
  asset: Box,
  text: NotebookText,
  image: ImageIcon,
  video: Film,
  audio: Music,
  note: NotebookText,
  storyboard_script: NotebookText,
  director_3d: Box,
  panorama_360: Box,
  composition: Layers,
  file: Box,
  action: Wand2,
  export: Download,
};

const actionIcons: Partial<Record<CanvasActionKind, typeof Box>> = {
  open: ExternalLink,
  "generate-script": NotebookText,
  "extract-characters": UserRound,
  "generate-frame": ImageIcon,
  "generate-video-prompt": Sparkles,
  "generate-video": Play,
  "batch-frames": ImageIcon,
  "batch-video-prompts": Sparkles,
  "batch-videos": Play,
  "assemble-video": Film,
  download: Download,
};

const statusClass = {
  idle: "bg-[--text-muted]",
  ready: "bg-[--warning]",
  running: "bg-primary",
  completed: "bg-[--success]",
  failed: "bg-destructive",
};

function mediaLooksLikeVideo(url?: string | null) {
  return Boolean(url?.match(/\.(mp4|mov|webm|m4v)(\?|$)/i));
}

export const CanvasNode = memo(function CanvasNode({
  data,
  selected,
}: NodeProps<NodeData>) {
  const t = useTranslations("project.canvas");
  const Icon = kindIcons[data.kind];
  const hasImagePreview = data.previewUrl && !mediaLooksLikeVideo(data.previewUrl);

  return (
    <div
      className={cn(
        "w-[250px] overflow-hidden rounded-lg border bg-white text-left shadow-sm transition-all",
        selected
          ? "border-primary shadow-lg shadow-primary/15"
          : "border-[--border-subtle] hover:border-[--border-hover] hover:shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-primary"
      />
      <div className="flex h-[68px] items-start gap-3 border-b border-[--border-subtle] bg-white px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[--surface] text-[--text-secondary]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", statusClass[data.status])} />
            <span className="text-[10px] font-semibold uppercase text-[--text-muted]">
              {t(`kinds.${data.kind}`)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-[--text-primary]">
            {data.title}
          </p>
          <p className="truncate text-xs text-[--text-muted]">{data.subtitle}</p>
        </div>
      </div>

      <div className="h-[96px] bg-[--surface]">
        {hasImagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.previewUrl ?? ""}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {mediaLooksLikeVideo(data.previewUrl) ? (
              <Film className="h-6 w-6 text-[--text-muted]" />
            ) : (
              <Icon className="h-6 w-6 text-[--text-muted]" />
            )}
          </div>
        )}
      </div>

      <div className="flex h-11 items-center gap-1 border-t border-[--border-subtle] px-2">
        {data.actions.slice(0, 5).map((action) => {
          const ActionIcon = actionIcons[action] ?? Wand2;
          return (
            <button
              key={action}
              type="button"
              title={t(`actions.${action}`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[--text-muted] transition-colors hover:bg-[--surface] hover:text-primary"
              onClick={(event) => {
                event.stopPropagation();
                data.onAction?.(action, data);
              }}
            >
              <ActionIcon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[--text-secondary]"
      />
    </div>
  );
});
