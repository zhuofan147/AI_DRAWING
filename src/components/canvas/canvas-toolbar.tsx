"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpenText,
  Check,
  ChevronDown,
  Clapperboard,
  Eye,
  Filter,
  LayoutGrid,
  ListVideo,
  RefreshCw,
  Route,
  Save,
  Settings2,
  SlidersHorizontal,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildCanvasPageFlowLinks,
  type CanvasPageFlowLinkKey,
} from "@/lib/canvas/page-flow-links";
import { canvasViewKinds, type CanvasViewKind } from "@/lib/canvas/views";
import { cn } from "@/lib/utils";
import type { CanvasNodeKind, CanvasNodeStatus } from "@/lib/canvas/types";

export type CanvasKindFilter = "all" | CanvasNodeKind;
export type CanvasStatusFilter = "all" | CanvasNodeStatus;

interface CanvasToolbarProps {
  locale: string;
  projectId: string;
  viewKind: CanvasViewKind;
  kindFilter: CanvasKindFilter;
  statusFilter: CanvasStatusFilter;
  ratio: string;
  overwrite: boolean;
  saving: boolean;
  refreshing: boolean;
  onViewKindChange: (value: CanvasViewKind) => void;
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

const pageFlowIcons: Record<CanvasPageFlowLinkKey, LucideIcon> = {
  episodes: ListVideo,
  script: BookOpenText,
  characters: Users,
  storyboard: Clapperboard,
  preview: Eye,
  import: UploadCloud,
  prompts: Settings2,
};

function ToolbarDropdown<T extends string>({
  value,
  options,
  className,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  className?: string;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-[13px] font-medium outline-none transition-all",
          "border-[var(--border-subtle)] bg-[var(--panel)] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          "hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
          open && "border-primary/55 bg-[var(--surface-hover)] text-[var(--text-primary)] ring-2 ring-primary/15",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[150px] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel)] p-1 shadow-2xl shadow-black/45 ring-1 ring-white/[0.04]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageFlowMenu({ locale, projectId }: { locale: string; projectId: string }) {
  const t = useTranslations("project.canvas.pageFlow");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const links = buildCanvasPageFlowLinks(locale, projectId);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[13px] font-medium outline-none transition-all",
          "border-[var(--border-subtle)] bg-[var(--panel)] text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          "hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
          open && "border-primary/55 bg-[var(--surface-hover)] text-[var(--text-primary)] ring-2 ring-primary/15",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <Route className="h-3.5 w-3.5 text-primary" />
        <span>{t("trigger")}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[var(--text-muted)] transition-transform",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel)] p-1 shadow-2xl shadow-black/45 ring-1 ring-white/[0.04]"
        >
          {links.map((link) => {
            const Icon = pageFlowIcons[link.key];
            return (
              <Link
                key={link.key}
                href={link.href}
                role="menuitem"
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                onClick={() => setOpen(false)}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{t(`items.${link.key}`)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CanvasToolbar({
  locale,
  projectId,
  viewKind,
  kindFilter,
  statusFilter,
  ratio,
  overwrite,
  saving,
  refreshing,
  onViewKindChange,
  onKindFilterChange,
  onStatusFilterChange,
  onRatioChange,
  onOverwriteChange,
  onAutoLayout,
  onRefresh,
  onSave,
}: CanvasToolbarProps) {
  const t = useTranslations("project.canvas");
  const viewItems = canvasViewKinds.map((view) => ({
    value: view,
    label: t(`views.${view}`),
  }));
  const kindItems = kindOptions.map((kind) => ({
    value: kind,
    label: kind === "all" ? t("filters.allKinds") : t(`kinds.${kind}`),
  }));
  const statusItems = statusOptions.map((status) => ({
    value: status,
    label: status === "all" ? t("filters.allStatuses") : t(`statuses.${status}`),
  }));
  const ratioItems = [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
  ];

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-2 border-b border-[--border-subtle] bg-[--panel] px-3 py-2 lg:px-4">
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

      <PageFlowMenu locale={locale} projectId={projectId} />

      <div className="hidden h-7 w-px bg-[--border-subtle] sm:block" />

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[--text-muted]" />
        <ToolbarDropdown
          value={viewKind}
          options={viewItems}
          onChange={onViewKindChange}
          className="w-[148px]"
        />
        <ToolbarDropdown
          value={kindFilter}
          options={kindItems}
          onChange={onKindFilterChange}
          className="w-[132px]"
        />
        <ToolbarDropdown
          value={statusFilter}
          options={statusItems}
          onChange={onStatusFilterChange}
          className="w-[132px]"
        />
        <ToolbarDropdown
          value={ratio}
          options={ratioItems}
          onChange={onRatioChange}
          className="w-[90px]"
        />
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
