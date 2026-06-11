import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { findProject } from "@/lib/assert-project-ownership";
import { id as genId } from "@/lib/id";
import { canvasKindFromUploadedFile } from "@/lib/canvas/manual-nodes";
import { canvasUploadDir, safeUploadExtension, uploadApiPath } from "@/lib/canvas/upload-storage";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const project = await findProject(request, projectId);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const extension = safeUploadExtension(file.name);
  const dir = canvasUploadDir(projectId);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${genId()}.${extension}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    name: file.name,
    type: file.type,
    size: file.size,
    kind: canvasKindFromUploadedFile(file),
    filePath,
    url: uploadApiPath(filePath),
  });
}
