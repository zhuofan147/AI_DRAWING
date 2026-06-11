import { describe, expect, it } from "vitest";
import { safeUploadExtension, uploadApiPath } from "./upload-storage";

describe("canvas upload storage", () => {
  it("keeps only a safe lowercase extension", () => {
    expect(safeUploadExtension("cover.PNG")).toBe("png");
    expect(safeUploadExtension("../../secret")).toBe("bin");
    expect(safeUploadExtension("bad.exe")).toBe("bin");
  });

  it("builds an api path for uploaded canvas resources", () => {
    expect(uploadApiPath("uploads\\canvas\\project-1\\file.png")).toBe("/api/uploads/canvas/project-1/file.png");
  });
});
