import { NextResponse } from "next/server";
import { findProject } from "@/lib/assert-project-ownership";
import { resolveImageProvider, resolveVideoProvider, type ModelConfigPayload } from "@/lib/ai/provider-factory";
import { canvasUploadDir, uploadApiPath } from "@/lib/canvas/upload-storage";

export const maxDuration = 300;

function ratioToImageOpts(ratio?: string): { aspectRatio?: string; size?: string } {
  switch (ratio) {
    case "9:16":
      return { aspectRatio: "9:16", size: "1440x2560" };
    case "1:1":
      return { aspectRatio: "1:1", size: "2048x2048" };
    case "2:1":
      return { aspectRatio: "2:1", size: "2560x1280" };
    default:
      return { aspectRatio: "16:9", size: "2560x1440" };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const project = await findProject(request, projectId);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    kind?: string;
    prompt?: string;
    ratio?: string;
    duration?: number;
    referenceImagePath?: string;
    modelConfig?: ModelConfigPayload;
  };

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json({ error: "No prompt" }, { status: 400 });
  }

  const uploadDir = canvasUploadDir(projectId);

  if (body.kind === "image" || body.kind === "panorama_360") {
    const imageProvider = resolveImageProvider(body.modelConfig, uploadDir);
    const filePath = await imageProvider.generateImage(prompt, {
      quality: "hd",
      ...ratioToImageOpts(body.kind === "panorama_360" ? "2:1" : body.ratio),
    });

    return NextResponse.json({
      filePath,
      url: uploadApiPath(filePath),
    });
  }

  if (body.kind === "video") {
    if (!body.referenceImagePath) {
      return NextResponse.json({ error: "Video generation needs a reference image" }, { status: 400 });
    }
    const videoProvider = resolveVideoProvider(body.modelConfig, uploadDir);
    const result = await videoProvider.generateVideo({
      initialImage: body.referenceImagePath,
      prompt,
      duration: body.duration ?? 5,
      ratio: body.ratio ?? "16:9",
    });

    return NextResponse.json({
      filePath: result.filePath,
      lastFrameUrl: result.lastFrameUrl,
      url: uploadApiPath(result.filePath),
    });
  }

  return NextResponse.json({ error: "Unsupported canvas generation kind" }, { status: 400 });
}
