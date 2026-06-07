export type CanvasPageFlowLinkKey =
  | "episodes"
  | "script"
  | "characters"
  | "storyboard"
  | "preview"
  | "import"
  | "prompts";

export type CanvasPageFlowLink = {
  key: CanvasPageFlowLinkKey;
  href: string;
};

const pageFlowRoutes: Array<{ key: CanvasPageFlowLinkKey; segment: string }> = [
  { key: "episodes", segment: "episodes" },
  { key: "script", segment: "script" },
  { key: "characters", segment: "characters" },
  { key: "storyboard", segment: "storyboard" },
  { key: "preview", segment: "preview" },
  { key: "import", segment: "import" },
  { key: "prompts", segment: "prompts" },
];

export function buildCanvasPageFlowLinks(locale: string, projectId: string): CanvasPageFlowLink[] {
  const encodedProjectId = encodeURIComponent(projectId);

  return pageFlowRoutes.map(({ key, segment }) => ({
    key,
    href: `/${locale}/project/${encodedProjectId}/${segment}`,
  }));
}
