"use client";

import { use } from "react";
import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <CanvasWorkspace projectId={id} />;
}
