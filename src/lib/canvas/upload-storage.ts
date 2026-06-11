import path from "node:path";

const allowedExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "docx",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "mp4",
  "mov",
  "webm",
  "m4v",
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
]);

export function safeUploadExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!extension || extension === filename.toLowerCase()) return "bin";
  return allowedExtensions.has(extension) ? extension : "bin";
}

export function canvasUploadDir(projectId: string, uploadRoot = process.env.UPLOAD_DIR || "./uploads") {
  return path.join(uploadRoot, "canvas", projectId);
}

export function uploadApiPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  const stripped = normalized.replace(/^.*?uploads\//, "");
  return `/api/uploads/${stripped}`;
}
