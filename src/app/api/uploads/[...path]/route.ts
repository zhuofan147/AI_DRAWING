import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const uploadRoot = process.env.UPLOAD_DIR || "./uploads";

const contentTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const root = path.resolve(uploadRoot);
  const target = path.resolve(root, ...parts);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await fs.readFile(target);
    const extension = target.split(".").pop()?.toLowerCase() ?? "";
    return new Response(data, {
      headers: {
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
