"use client";

import { useTranslations } from "next-intl";
import {
  Filter,
  LayoutGrid,
  RefreshCw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CanvasNodeKind, CanvasNodeStatus } from "@/lib/canvas/types";

export type CanvasKindFilter = "all" | CanvasNodeKind;
export type CanvasStatusFilter = "all" | CanvasNodeStatus;

interface CanvasToolbarProps {
  kindFilter: CanvasKindFilter;
  statusFilter: CanvasStatusFilter;
  ratio: string;
  overwrite: boolean;
  saving: boolean;
  refreshing: boolean;
  onKindFilterChange: (value: CanvasKindFilter) => void;
  onStatusFilterChange: (value: CanvasStatusFilter) => void;
  onRatioChange: (value: string) => void;
  onOverwriteChange: (value: boolean) => void;
  onAutoLayout: () => void;
  onRefresh: () => void;
  onSave: () => void;
}

const kindOptions: CanvasKindFilter[] = [
  "all",
  "project",
  "episode",
  "character",
  "shot",
  "asset",
  "export",
];

const statusOptions: CanvasStatusFilter[] = [
  "all",
  "idle",
  "ready",
  "running",
  "completed",
  "failed",
];

export function CanvasToolbar({
  kindFilter,
  statusFilter,
  ratio,
  overwrite,
  saving,
  refreshing,
  onKindFilterChange,
  onStatusFilterChange,
  onRatioChange,
  onOverwriteChange,
  onAutoLayout,
  onRefresh,
  onSave,
}: CanvasToolbarProps) {
  const t = useTranslations("project.canvas");

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-2 border-b border-[--border-subtle] bg-white px-3 py-2 lg:px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-[--text-primary]">{t("title")}</p>
          <p className="text-xs text-[--text-muted]">{t("subtitle")}</p>
        </div>
      </div>

      <div className="h-7 w-px bg-[--border-subtle]" />

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[--text-muted]" />
        <Select value={kindFilter} onValueChange={(value) => onKindFilterChange(value as CanvasKindFilter)}>
          <SelectTrigger size="sm" className="w-[120px]" />
          <SelectContent>
            {kindOptions.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind === "all" ? t("filters.allKinds") : t(`kinds.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as CanvasStatusFilter)}>
          <SelectTrigger size="sm" className="w-[120px]" />
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all" ? t("filters.allStatuses") : t(`statuses.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ratio} onValueChange={onRatioChange}>
          <SelectTrigger size="sm" className="w-[88px]" />
          <SelectContent>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="flex h-8 items-center gap-2 rounded-lg border border-[--border-subtle] px-2 text-xs text-[--text-secondary]">
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(event) => onOverwriteChange(event.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        {t("overwrite")}
      </label>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onAutoLayout}>
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden md:inline">{t("autoLayout")}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          <span className="hidden md:inline">{t("refresh")}</span>
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4" />
          <span className="hidden md:inline">{saving ? t("saving") : t("saveLayout")}</span>
        </Button>
      </div>
    </div>
  );
}
