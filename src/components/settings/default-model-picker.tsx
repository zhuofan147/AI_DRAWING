"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ImageIcon, Save, Type, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useModelStore, type Capability, type ModelRef } from "@/stores/model-store";
import { useTranslations } from "next-intl";

interface PickerRowProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  options: {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
  }[];
  value: ModelRef | null;
  onChange: (ref: ModelRef | null) => void;
}

function PickerRow({
  label,
  icon,
  color,
  options,
  value,
  onChange,
}: PickerRowProps) {
  const currentValue = value ? `${value.providerId}:${value.modelId}` : "";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[--border-subtle] bg-[--surface]/50 px-3 py-2.5">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[--text-muted]">
          {label}
        </Label>
        <select
          value={currentValue}
          onChange={(e) => {
            if (!e.target.value) {
              onChange(null);
              return;
            }
            const [providerId, ...rest] = e.target.value.split(":");
            const modelId = rest.join(":");
            onChange({ providerId, modelId });
          }}
          className="mt-0.5 block w-full rounded-lg border-0 bg-transparent py-0 text-sm font-medium text-[--text-primary] outline-none"
        >
          <option value="">--</option>
          {options.map((opt) => (
            <option
              key={`${opt.providerId}:${opt.modelId}`}
              value={`${opt.providerId}:${opt.modelId}`}
            >
              {opt.providerName} / {opt.modelName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function DefaultModelPicker() {
  const t = useTranslations("settings");
  const {
    providers,
    defaultTextModel,
    defaultImageModel,
    defaultVideoModel,
    setDefaultTextModel,
    setDefaultImageModel,
    setDefaultVideoModel,
  } = useModelStore();

  const [draftTextModel, setDraftTextModel] = useState<ModelRef | null>(defaultTextModel);
  const [draftImageModel, setDraftImageModel] = useState<ModelRef | null>(defaultImageModel);
  const [draftVideoModel, setDraftVideoModel] = useState<ModelRef | null>(defaultVideoModel);

  function getOptions(capability: Capability) {
    const result: {
      providerId: string;
      providerName: string;
      modelId: string;
      modelName: string;
    }[] = [];
    for (const p of providers) {
      if (!p || !p.models) continue;
      if (p.capability !== capability) continue;
      for (const m of p.models) {
        if (!m || !m.checked) continue;
        result.push({
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelName: m.name,
        });
      }
    }
    return result;
  }

  const optionsByCapability = {
    text: getOptions("text"),
    image: getOptions("image"),
    video: getOptions("video"),
  };

  function effectiveRef(capability: Capability, current: ModelRef | null) {
    const options = optionsByCapability[capability];
    if (
      current &&
      options.some((option) =>
        option.providerId === current.providerId && option.modelId === current.modelId
      )
    ) {
      return current;
    }

    const first = options[0];
    return first ? { providerId: first.providerId, modelId: first.modelId } : null;
  }

  const effectiveTextModel = effectiveRef("text", draftTextModel);
  const effectiveImageModel = effectiveRef("image", draftImageModel);
  const effectiveVideoModel = effectiveRef("video", draftVideoModel);

  const hasChanges =
    !sameRef(effectiveTextModel, defaultTextModel) ||
    !sameRef(effectiveImageModel, defaultImageModel) ||
    !sameRef(effectiveVideoModel, defaultVideoModel);

  function handleSave() {
    setDefaultTextModel(effectiveTextModel);
    setDefaultImageModel(effectiveImageModel);
    setDefaultVideoModel(effectiveVideoModel);
    toast.success(t("modelConfigSaved"));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PickerRow
          label={t("defaultTextModel")}
          icon={<Type className="h-4 w-4" />}
          color="bg-blue-500/10 text-blue-600"
          options={optionsByCapability.text}
          value={effectiveTextModel}
          onChange={setDraftTextModel}
        />
        <PickerRow
          label={t("defaultImageModel")}
          icon={<ImageIcon className="h-4 w-4" />}
          color="bg-emerald-500/10 text-emerald-600"
          options={optionsByCapability.image}
          value={effectiveImageModel}
          onChange={setDraftImageModel}
        />
        <PickerRow
          label={t("defaultVideoModel")}
          icon={<VideoIcon className="h-4 w-4" />}
          color="bg-purple-500/10 text-purple-600"
          options={optionsByCapability.video}
          value={effectiveVideoModel}
          onChange={setDraftVideoModel}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant={hasChanges ? "default" : "outline"}
          onClick={handleSave}
        >
          {hasChanges ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {t("saveModelConfig")}
        </Button>
      </div>
    </div>
  );
}

function sameRef(a: ModelRef | null, b: ModelRef | null) {
  return a?.providerId === b?.providerId && a?.modelId === b?.modelId;
}
