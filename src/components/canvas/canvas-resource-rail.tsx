"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Box, Film, ImageIcon, Layers, Music, NotebookText, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CanvasNodeData, CanvasNodeKind } from "@/lib/canvas/types";

interface CanvasResourceRailProps {
  nodes: CanvasNodeData[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
}

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
  action: Box,
  export: Box,
};

const groups: CanvasNodeKind[] = [
  "project",
  "text",
  "image",
  "video",
  "audio",
  "note",
  "storyboard_script",
  "director_3d",
  "panorama_360",
  "composition",
  "file",
  "episode",
  "character",
  "shot",
  "asset",
  "export",
];

export function CanvasResourceRail({
  nodes,
  selectedId,
  search,
  onSearchChange,
  onSelect,
}: CanvasResourceRailProps) {
  const t = useTranslations("project.canvas");
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return nodes;
    return nodes.filter((node) => {
      const haystack = `${node.title} ${node.subtitle} ${node.id}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [nodes, normalizedSearch]);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-[--border-subtle] bg-white xl:flex xl:flex-col">
      <div className="border-b border-[--border-subtle] px-4 py-3">
        <p className="text-sm font-semibold text-[--text-primary]">{t("resources")}</p>
        <p className="mt-1 text-xs text-[--text-muted]">
          {t("resourceCount", { count: nodes.length })}
        </p>
      </div>

      <div className="border-b border-[--border-subtle] p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--text-muted]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 rounded-lg pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {groups.map((kind) => {
          const items = filtered.filter((node) => node.kind === kind);
          if (items.length === 0) return null;
          const Icon = kindIcons[kind];

          return (
            <section key={kind} className="mb-4">
              <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase text-[--text-muted]">
                <Icon className="h-3.5 w-3.5" />
                {t(`kinds.${kind}`)}
                <span className="ml-auto">{items.length}</span>
              </div>
              <div className="space-y-1">
                {items.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                      selectedId === node.id
                        ? "bg-primary/8 text-primary"
                        : "text-[--text-secondary] hover:bg-[--surface] hover:text-[--text-primary]",
                    )}
                    onClick={() => onSelect(node.id)}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        node.status === "completed" && "bg-[--success]",
                        node.status === "running" && "bg-primary",
                        node.status === "ready" && "bg-[--warning]",
                        node.status === "failed" && "bg-destructive",
                        node.status === "idle" && "bg-[--text-muted]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{node.title}</span>
                      <span className="block truncate text-[11px] text-[--text-muted]">
                        {node.subtitle}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
