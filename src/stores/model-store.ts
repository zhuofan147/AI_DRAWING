import { create } from "zustand";
import { persist } from "zustand/middleware";
import { id as genId } from "@/lib/id";

/** Validate that a value looks like a ModelRef — return it or null. */
function sanitizeModelRef(v: unknown): ModelRef | null {
  if (v && typeof v === "object" && "providerId" in v && "modelId" in v) {
    const ref = v as ModelRef;
    if (typeof ref.providerId === "string" && typeof ref.modelId === "string") {
      return ref;
    }
  }
  return null;
}

export type Protocol = "openai" | "gemini" | "seedance" | "ucloud-seedance" | "kling" | "wan" | "dashscope";
export type Capability = "text" | "image" | "video";

export interface Model {
  id: string;
  name: string;
  checked: boolean;
}

export interface Provider {
  id: string;
  name: string;
  protocol: Protocol;
  capability: Capability;
  baseUrl: string;
  apiKey: string;
  secretKey?: string;
  models: Model[];
}

export interface ModelRef {
  providerId: string;
  modelId: string;
}

export interface ModelConfig {
  text: { protocol: Protocol; baseUrl: string; apiKey: string; secretKey?: string; modelId: string } | null;
  image: { protocol: Protocol; baseUrl: string; apiKey: string; secretKey?: string; modelId: string } | null;
  video: { protocol: Protocol; baseUrl: string; apiKey: string; secretKey?: string; modelId: string } | null;
}

interface ModelStore {
  providers: Provider[];
  defaultTextModel: ModelRef | null;
  defaultImageModel: ModelRef | null;
  defaultVideoModel: ModelRef | null;

  addProvider: (provider: Omit<Provider, "id" | "models">) => string;
  updateProvider: (id: string, updates: Partial<Omit<Provider, "id">>) => void;
  removeProvider: (id: string) => void;
  setModels: (providerId: string, models: Model[]) => void;
  toggleModel: (providerId: string, modelId: string) => void;
  addManualModel: (providerId: string, modelId: string) => void;
  removeModel: (providerId: string, modelId: string) => void;
  setDefaultTextModel: (ref: ModelRef | null) => void;
  setDefaultImageModel: (ref: ModelRef | null) => void;
  setDefaultVideoModel: (ref: ModelRef | null) => void;
  getModelConfig: () => ModelConfig;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      providers: [],
      defaultTextModel: null,
      defaultImageModel: null,
      defaultVideoModel: null,

      addProvider: (provider) => {
        const id = genId();
        set((state) => ({
          providers: [...state.providers, { ...provider, id, models: [] }],
        }));
        return id;
      },

      updateProvider: (id, updates) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      removeProvider: (id) => {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          defaultTextModel:
            state.defaultTextModel?.providerId === id ? null : state.defaultTextModel,
          defaultImageModel:
            state.defaultImageModel?.providerId === id ? null : state.defaultImageModel,
          defaultVideoModel:
            state.defaultVideoModel?.providerId === id ? null : state.defaultVideoModel,
        }));
      },

      setModels: (providerId, models) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId ? { ...p, models } : p
          ),
        }));
      },

      toggleModel: (providerId, modelId) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId
              ? {
                  ...p,
                  models: p.models.map((m) =>
                    m.id === modelId ? { ...m, checked: !m.checked } : m
                  ),
                }
              : p
          ),
        }));
      },

      addManualModel: (providerId, modelId) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId
              ? {
                  ...p,
                  models: [
                    ...p.models,
                    { id: modelId, name: modelId, checked: true },
                  ],
                }
              : p
          ),
        }));
      },

      removeModel: (providerId, modelId) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId
              ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
              : p
          ),
        }));
      },

      setDefaultTextModel: (ref) => set({ defaultTextModel: ref }),
      setDefaultImageModel: (ref) => set({ defaultImageModel: ref }),
      setDefaultVideoModel: (ref) => set({ defaultVideoModel: ref }),

      getModelConfig: () => {
        const state = get();
        function providerConfig(provider: Provider, modelId: string) {
          return {
            protocol: provider.protocol,
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            secretKey: provider.secretKey,
            modelId,
          };
        }
        function resolve(capability: Capability, ref: ModelRef | null) {
          if (ref) {
            const provider = state.providers.find((p) =>
              p.id === ref.providerId && p.capability === capability
            );
            if (provider) return providerConfig(provider, ref.modelId);
          }

          const fallbackProvider = state.providers.find((p) =>
            p.capability === capability && p.models.some((m) => m.checked)
          );
          const fallbackModel = fallbackProvider?.models.find((m) => m.checked);
          if (!fallbackProvider || !fallbackModel) return null;

          return providerConfig(fallbackProvider, fallbackModel.id);
        }
        return {
          text: resolve("text", state.defaultTextModel),
          image: resolve("image", state.defaultImageModel),
          video: resolve("video", state.defaultVideoModel),
        };
      },
    }),
    {
      name: "model-store",
      version: 2,
      migrate: (persistedState: unknown, fromVersion: number) => {
        // Called only when stored data has an explicit version number that differs from 2.
        // For data with no version field (legacy), the merge function below handles migration.
        try {
          if (fromVersion < 2) {
            const state = persistedState as Record<string, unknown>;
            const providers = ((state.providers as Array<Record<string, unknown>>) ?? [])
              .filter((p): p is Record<string, unknown> => p != null);
            return {
              ...state,
              providers: providers.map((p) => {
                const caps = (p.capabilities as string[]) ?? [];
                return { ...p, capability: caps[0] ?? "text" };
              }),
              defaultTextModel: sanitizeModelRef(state.defaultTextModel),
              defaultImageModel: sanitizeModelRef(state.defaultImageModel),
              defaultVideoModel: sanitizeModelRef(state.defaultVideoModel),
            };
          }
          return persistedState;
        } catch {
          console.warn("[model-store] Migration failed; returning persisted state as-is.");
          return persistedState;
        }
      },
      merge: (persistedState: unknown, currentState) => {
        // Handles legacy stored data that has no version field (Zustand skips migrate in that case).
        try {
          const ps = persistedState as Record<string, unknown> | null | undefined;
          const providers = (ps?.providers as Array<Record<string, unknown>>) ?? [];
          const migrated = providers
            .filter((p): p is Record<string, unknown> => p != null) // remove null entries
            .map((p) => {
              if (typeof p.capability === "string") return p; // already migrated
              const caps = (p.capabilities as string[]) ?? [];
              return { ...p, capability: caps[0] ?? "text" };
            });
          return {
            ...currentState,
            ...(ps ?? {}),
            providers: migrated as unknown as Provider[],
            // Sanitize: ensure defaults are ModelRef|null, not arbitrary strings
            defaultTextModel: sanitizeModelRef(ps?.defaultTextModel),
            defaultImageModel: sanitizeModelRef(ps?.defaultImageModel),
            defaultVideoModel: sanitizeModelRef(ps?.defaultVideoModel),
          };
        } catch {
          // If migration fails, return fresh state (user will need to reconfigure)
          console.warn("[model-store] Failed to migrate persisted state; resetting.");
          return currentState;
        }
      },
    }
  )
);
