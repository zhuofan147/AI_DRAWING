"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useModelStore } from "@/stores/model-store";
import { toast } from "sonner";
import type { Capability, ModelRef } from "@/stores/model-store";

const messageKeys: Record<Capability, string> = {
  text: "notConfiguredText",
  image: "notConfiguredImage",
  video: "notConfiguredVideo",
};

/**
 * Returns a guard() function for the given model capability.
 *
 * If an optional `localRef` is provided, it will be checked instead of
 * (and with fallback to) the global default model. This allows per-component
 * model override (e.g., CharacterCard's InlineModelPicker) to satisfy the check.
 *
 * Call guard() at the top of any AI generation handler.
 * Returns false (and shows a toast) if NO model is available for the capability.
 * Returns true if a model is configured and the action can proceed.
 */
export function useModelGuard(capability: Capability): (localRef?: ModelRef | null) => boolean {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("settings");
  const getModelConfig = useModelStore((s) => s.getModelConfig);
  const providers = useModelStore((s) => s.providers);

  return useCallback((localRef?: ModelRef | null): boolean => {
    // If the store hasn't hydrated from localStorage yet, allow through.
    // The API will handle missing config server-side.
    if (!useModelStore.persist.hasHydrated()) {
      return true;
    }

    // 1. Check local ref first (per-component model selection)
    if (localRef) {
      const provider = providers.find((p) => p && p.id === localRef.providerId);
      if (provider && localRef.modelId) {
        return true;
      }
    }

    // 2. Check global default
    const config = getModelConfig();
    if (config[capability] !== null) {
      return true;
    }

    // 3. Fallback: check if any checked model exists for this capability
    for (const p of providers) {
      if (!p || !p.models) continue;
      if (p.capability !== capability) continue;
      if (p.models.some((m) => m && m.checked)) {
        return true;
      }
    }

    // 4. Nothing found — warn
    toast.warning(t(messageKeys[capability]), {
      action: {
        label: t("goSettings"),
        onClick: () => router.push(`/${locale}/settings`),
      },
    });
    return false;
  }, [capability, getModelConfig, locale, router, t, providers]);
}
