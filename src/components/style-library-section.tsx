"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-fetch";
import { stylePresets, type StylePreset } from "@/lib/style-library";

function swatchesFromPalette(palette: string) {
  return palette
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

const swatchColors = [
  "bg-[#101010]",
  "bg-[#F7F1E2]",
  "bg-[#64748B]",
  "bg-[#D6472B]",
  "bg-[#0EA5A8]",
  "bg-[#C026D3]",
  "bg-[#1E1B4B]",
  "bg-[#F59E0B]",
  "bg-[#7C5A36]",
  "bg-[#4D7C0F]",
];

export function StyleLibrarySection() {
  const t = useTranslations("dashboard.styleLibrary");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [selected, setSelected] = useState<StylePreset | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function createStyledProject() {
    if (!selected || !title.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          colorPalette: selected.colorPalette,
          worldSetting: selected.worldSetting,
        }),
      });
      const project = await res.json();
      router.push(`/${locale}/project/${project.id}/import`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-white">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[--text-primary]">
                {t("title")}
              </h3>
              <p className="text-xs text-[--text-muted]">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stylePresets.map((preset, presetIndex) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelected(preset);
                setTitle(preset.title);
              }}
              className="group flex min-h-[148px] flex-col justify-between rounded-xl border border-[--border-subtle] bg-white p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[--border-hover] hover:shadow-lg hover:shadow-black/5"
            >
              <div>
                <div className="mb-3 flex gap-1">
                  {swatchesFromPalette(preset.colorPalette).map((label, i) => (
                    <span
                      key={`${preset.id}-${label}`}
                      className={`h-5 flex-1 rounded-md ${swatchColors[(presetIndex + i) % swatchColors.length]}`}
                      title={label}
                    />
                  ))}
                </div>
                <div className="text-sm font-semibold text-[--text-primary]">
                  {preset.title}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[--text-muted]">
                  {preset.description}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Plus className="h-3.5 w-3.5" />
                {t("create")}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-[--border-subtle] bg-[--surface] p-3 text-xs leading-5 text-[--text-secondary]">
              {selected?.worldSetting}
            </div>
            <div className="space-y-2">
              <Label htmlFor="styled-project-title">{t("projectTitle")}</Label>
              <Input
                id="styled-project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    createStyledProject();
                  }
                }}
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              onClick={createStyledProject}
              disabled={loading || !title.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? tc("loading") : t("createProject")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
