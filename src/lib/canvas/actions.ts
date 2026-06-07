import type { CanvasActionKind } from "./types";

type GenerateAction =
  | "shot_split"
  | "single_frame_generate"
  | "batch_frame_generate"
  | "single_video_prompt"
  | "batch_video_prompt"
  | "single_video_generate"
  | "batch_video_generate"
  | "single_reference_video"
  | "batch_reference_video"
  | "video_assemble";

export type CanvasGenerateInput = {
  action: Exclude<CanvasActionKind, "open" | "download">;
  shotId?: string;
  episodeId?: string;
  versionId?: string;
  ratio?: string;
  overwrite?: boolean;
  generationMode?: "keyframe" | "reference";
  modelConfig: unknown;
};

const actionMap: Record<CanvasGenerateInput["action"], GenerateAction> = {
  "generate-frame": "single_frame_generate",
  "generate-video-prompt": "single_video_prompt",
  "generate-video": "single_video_generate",
  "batch-frames": "batch_frame_generate",
  "batch-video-prompts": "batch_video_prompt",
  "batch-videos": "batch_video_generate",
  "assemble-video": "video_assemble",
};

export function buildGenerateRequest(input: CanvasGenerateInput) {
  const action = resolveGenerateAction(input);

  return {
    action,
    payload: {
      ...(input.shotId && { shotId: input.shotId }),
      ...(input.versionId && { versionId: input.versionId }),
      ...(input.ratio && { ratio: input.ratio }),
      ...(input.overwrite !== undefined && { overwrite: input.overwrite }),
    },
    modelConfig: input.modelConfig,
    episodeId: input.episodeId ?? undefined,
  };
}

function resolveGenerateAction(input: CanvasGenerateInput): GenerateAction {
  if (input.generationMode === "reference") {
    if (input.action === "generate-video") return "single_reference_video";
    if (input.action === "batch-videos") return "batch_reference_video";
  }

  return actionMap[input.action];
}
