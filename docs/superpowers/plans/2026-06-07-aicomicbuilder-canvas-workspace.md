# AIComicBuilder 画布工作区实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `G:\Project\AIComicBuilder` 中新增项目级画布工作区，把现有项目、分集、角色、镜头、素材、生成动作和导出能力映射成更易操作的节点图。

**Architecture:** AIComicBuilder 继续作为产品主干，不重写现有生成链路。新增一层薄画布能力：Drizzle 保存布局、API 读写画布布局、纯函数映射业务数据到节点图、React Flow 渲染画布、节点操作复用现有 `/api/projects/[id]/generate`。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand, Drizzle ORM, SQLite, React Flow, Vitest, AIComicBuilder 现有 API。

---

## 范围确认

本计划只实现第一版“AIComicBuilder 主干 + 项目级画布工作区”。

本计划会做：

- 新增 `/${locale}/project/${id}/canvas` 页面。
- 新增画布布局表 `canvas_layouts`。
- 新增画布布局 GET / PUT API。
- 新增业务数据到画布节点图的映射层。
- 新增画布 UI：左侧资源栏、中间节点图、右侧详情栏、顶部工具栏。
- 新增节点操作请求构造器，复用现有生成 API。
- 在项目顶部栏和分集工作流侧边栏增加“画布”入口。
- 增加状态、映射、布局 API、动作请求构造相关测试。

本计划不会做：

- 不重写 AIComicBuilder 的生成流程。
- 不替代现有分集、角色、分镜、预览、提示词页面。
- 不新增第二套项目/分集/镜头业务模型。
- 不做 Electron/Vite 桌面端打包。
- 不做多人协作。
- 不做插件系统。
- 不允许用户用任意连线直接改变业务逻辑。

## 文件结构

所有代码修改都发生在 `G:\Project\AIComicBuilder`：

- Modify: `package.json`，新增 `reactflow`、`vitest`、`vite-tsconfig-paths` 和 `test` 脚本。
- Create: `vitest.config.ts`，让 Vitest 能解析 `@/...` 路径别名。
- Modify: `src/app/api/projects/[id]/route.ts`，补齐现有 `and` 导入，避免画布依赖的项目聚合接口运行时报错。
- Modify: `src/app/api/projects/[id]/episodes/[episodeId]/route.ts`，补齐现有 `and` 导入，避免分集聚合接口运行时报错。
- Modify: `src/lib/db/schema.ts`，新增 `canvasLayouts` 表定义。
- Create: `drizzle/0054_add_canvas_layouts.sql`，新增画布布局迁移。
- Create: `src/lib/canvas/types.ts`，定义画布节点、连线、布局、视口类型。
- Create: `src/lib/canvas/status.ts`，定义业务状态到画布状态的转换函数。
- Create: `src/lib/canvas/status.test.ts`，测试状态转换优先级。
- Create: `src/lib/canvas/mapper.ts`，把项目聚合数据映射成画布节点图。
- Create: `src/lib/canvas/mapper.test.ts`，测试节点/连线生成和旧布局合并。
- Create: `src/lib/canvas/actions.ts`，把画布动作映射成现有生成 API 的请求体。
- Create: `src/lib/canvas/actions.test.ts`，测试动作请求体。
- Create: `src/app/api/projects/[id]/canvas/route.ts`，读写画布布局。
- Create: `src/app/api/projects/[id]/canvas/route.test.ts`，测试 JSON 解析和布局负载清洗函数。
- Create: `src/app/[locale]/project/[id]/canvas/page.tsx`，新增项目级画布页面。
- Create: `src/components/canvas/canvas-workspace.tsx`，画布主组件，负责 React Flow 状态、保存布局、执行动作。
- Create: `src/components/canvas/canvas-node.tsx`，节点卡片渲染。
- Create: `src/components/canvas/canvas-inspector.tsx`，右侧详情栏。
- Create: `src/components/canvas/canvas-toolbar.tsx`，顶部筛选、自动排列、保存按钮。
- Create: `src/components/canvas/canvas-resource-rail.tsx`，左侧资源栏。
- Modify: `src/app/[locale]/project/[id]/layout.tsx`，项目顶部栏增加画布入口。
- Modify: `src/components/editor/project-nav.tsx`，分集工作流侧边栏增加画布入口。
- Modify: `messages/zh.json`、`messages/en.json`、`messages/ja.json`、`messages/ko.json`，增加 `project.canvas`。

---

### Task 1: 基线检查、依赖安装、测试配置、现有聚合接口修复

**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/api/projects/[id]/episodes/[episodeId]/route.ts`

- [ ] **Step 1: 检查当前仓库状态**

Run:

```bash
git status --short
```

Expected: 记录已有用户改动。不要覆盖与本任务无关的改动。

- [ ] **Step 2: 运行当前 lint，作为基线**

Run:

```bash
pnpm lint
```

Expected: 如果当前主干已经失败，把原始失败信息记录到实施笔记里。后续每个任务只判断是否引入新的画布相关错误。

- [ ] **Step 3: 安装 React Flow、Vitest 和路径别名插件**

Run:

```bash
pnpm add reactflow
pnpm add -D vitest vite-tsconfig-paths
```

Expected: `package.json` 和 `pnpm-lock.yaml` 更新。

- [ ] **Step 4: 增加测试脚本**

把 `package.json` 的 `scripts` 从：

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

改为：

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 5: 创建 Vitest 配置**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
  },
});
```

- [ ] **Step 6: 修复项目聚合接口缺失的 `and` 导入**

在 `src/app/api/projects/[id]/route.ts` 中，把：

```ts
import { eq, asc, desc } from "drizzle-orm";
```

改为：

```ts
import { eq, asc, desc, and } from "drizzle-orm";
```

在 `src/app/api/projects/[id]/episodes/[episodeId]/route.ts` 中，把：

```ts
import { eq, asc, or, isNull, desc, inArray } from "drizzle-orm";
```

改为：

```ts
import { eq, asc, or, isNull, desc, inArray, and } from "drizzle-orm";
```

- [ ] **Step 7: 验证空测试命令可运行**

Run:

```bash
pnpm test -- --passWithNoTests
```

Expected: 在测试文件尚未添加前也能成功退出。

- [ ] **Step 8: 提交基线准备**

Run:

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/app/api/projects/[id]/route.ts src/app/api/projects/[id]/episodes/[episodeId]/route.ts
git commit -m "chore: prepare canvas workspace dependencies"
```

Expected: commit 成功。

---

### Task 2: 新增画布布局持久化

**Files:**

- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0054_add_canvas_layouts.sql`

- [ ] **Step 1: 在 Drizzle schema 中新增表**

在 `src/lib/db/schema.ts` 末尾追加：

```ts
export const canvasLayouts = sqliteTable("canvas_layouts", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  episodeId: text("episode_id").references(() => episodes.id, {
    onDelete: "cascade",
  }),
  scope: text("scope", { enum: ["project", "episode"] })
    .notNull()
    .default("project"),
  nodesJson: text("nodes_json").notNull().default("[]"),
  edgesJson: text("edges_json").notNull().default("[]"),
  viewportJson: text("viewport_json").notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

- [ ] **Step 2: 新增迁移 SQL**

Create `drizzle/0054_add_canvas_layouts.sql`:

```sql
CREATE TABLE `canvas_layouts` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `episode_id` text,
  `scope` text DEFAULT 'project' NOT NULL,
  `nodes_json` text DEFAULT '[]' NOT NULL,
  `edges_json` text DEFAULT '[]' NOT NULL,
  `viewport_json` text DEFAULT '{}' NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `canvas_layouts_project_scope_idx`
ON `canvas_layouts` (`project_id`, `scope`);
```

- [ ] **Step 3: 运行 lint**

Run:

```bash
pnpm lint
```

Expected: 没有新增 schema 相关错误。如果基线已有错误，确认没有出现 `canvasLayouts` 或 `index` 相关新错误。

- [ ] **Step 4: 提交布局表**

Run:

```bash
git add src/lib/db/schema.ts drizzle/0054_add_canvas_layouts.sql
git commit -m "feat: add canvas layout table"
```

Expected: commit 成功。

---

### Task 3: 新增画布领域类型和状态计算

**Files:**

- Create: `src/lib/canvas/types.ts`
- Create: `src/lib/canvas/status.ts`
- Create: `src/lib/canvas/status.test.ts`

- [ ] **Step 1: 创建画布类型**

Create `src/lib/canvas/types.ts`:

```ts
export type CanvasNodeKind =
  | "project"
  | "episode"
  | "character"
  | "shot"
  | "asset"
  | "action"
  | "export";

export type CanvasNodeStatus =
  | "idle"
  | "ready"
  | "running"
  | "completed"
  | "failed";

export type CanvasActionKind =
  | "open"
  | "generate-frame"
  | "generate-video-prompt"
  | "generate-video"
  | "batch-frames"
  | "batch-video-prompts"
  | "batch-videos"
  | "assemble-video"
  | "download";

export interface CanvasNodeData {
  id: string;
  kind: CanvasNodeKind;
  entityId: string;
  parentId?: string;
  title: string;
  subtitle: string;
  status: CanvasNodeStatus;
  href?: string;
  previewUrl?: string | null;
  actions: CanvasActionKind[];
  meta: Record<string, string | number | boolean | null | undefined>;
}

export interface CanvasEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CanvasLayoutNode {
  id: string;
  position: { x: number; y: number };
  collapsed?: boolean;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasGraph {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  layoutNodes: CanvasLayoutNode[];
  viewport: CanvasViewport;
}
```

- [ ] **Step 2: 创建状态转换函数**

Create `src/lib/canvas/status.ts`:

```ts
import type { CanvasNodeStatus } from "./types";

export function statusFromGenerationState(status?: string | null): CanvasNodeStatus {
  if (status === "generating" || status === "processing") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "idle";
}

export function statusFromParts(parts: {
  hasRequiredInput?: boolean;
  hasOutput?: boolean;
  isGenerating?: boolean;
  hasFailure?: boolean;
  isStale?: boolean;
}): CanvasNodeStatus {
  if (parts.hasFailure || parts.isStale) return "failed";
  if (parts.isGenerating) return "running";
  if (parts.hasOutput) return "completed";
  if (parts.hasRequiredInput) return "ready";
  return "idle";
}
```

- [ ] **Step 3: 添加状态测试**

Create `src/lib/canvas/status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { statusFromGenerationState, statusFromParts } from "./status";

describe("canvas status helpers", () => {
  it("maps generation states to canvas states", () => {
    expect(statusFromGenerationState("generating")).toBe("running");
    expect(statusFromGenerationState("processing")).toBe("running");
    expect(statusFromGenerationState("completed")).toBe("completed");
    expect(statusFromGenerationState("failed")).toBe("failed");
    expect(statusFromGenerationState("pending")).toBe("idle");
  });

  it("prioritizes failed and stale states", () => {
    expect(statusFromParts({ hasOutput: true, isStale: true })).toBe("failed");
    expect(statusFromParts({ hasRequiredInput: true, hasFailure: true })).toBe("failed");
    expect(statusFromParts({ isGenerating: true })).toBe("running");
    expect(statusFromParts({ hasOutput: true })).toBe("completed");
    expect(statusFromParts({ hasRequiredInput: true })).toBe("ready");
    expect(statusFromParts({})).toBe("idle");
  });
});
```

- [ ] **Step 4: 运行状态测试**

Run:

```bash
pnpm test -- src/lib/canvas/status.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交画布基础类型**

Run:

```bash
git add src/lib/canvas/types.ts src/lib/canvas/status.ts src/lib/canvas/status.test.ts
git commit -m "feat: add canvas domain types"
```

Expected: commit 成功。

---

### Task 4: 新增业务数据到画布节点图的映射层

**Files:**

- Create: `src/lib/canvas/mapper.ts`
- Create: `src/lib/canvas/mapper.test.ts`

- [ ] **Step 1: 创建映射层输入类型和工具函数**

Create `src/lib/canvas/mapper.ts`:

```ts
import type {
  CanvasEdgeData,
  CanvasGraph,
  CanvasLayoutNode,
  CanvasNodeData,
  CanvasViewport,
} from "./types";
import { statusFromGenerationState, statusFromParts } from "./status";

type Character = {
  id: string;
  name: string;
  scope?: string | null;
  episodeId?: string | null;
  referenceImage?: string | null;
  description?: string | null;
};

type ShotAsset = {
  id: string;
  shotId: string;
  type: string;
  fileUrl: string | null;
  status: string;
  isActive: number;
};

type Shot = {
  id: string;
  sequence: number;
  prompt?: string | null;
  videoPrompt?: string | null;
  status?: string | null;
  episodeId?: string | null;
  isStale?: boolean | number | null;
  assets?: ShotAsset[] | null;
};

type Episode = {
  id: string;
  title: string;
  sequence: number;
  status?: string | null;
  finalVideoUrl?: string | null;
};

export type CanvasProjectInput = {
  id: string;
  title: string;
  status?: string | null;
  finalVideoUrl?: string | null;
  episodes?: Episode[];
  characters?: Character[];
  shots?: Shot[];
};

const defaultViewport: CanvasViewport = { x: 0, y: 0, zoom: 1 };

function nodeId(kind: string, id: string) {
  return `${kind}:${id}`;
}

function edge(source: string, target: string, label?: string): CanvasEdgeData {
  return {
    id: `${source}->${target}${label ? `:${label}` : ""}`,
    source,
    target,
    label,
  };
}

function activeAssets(shot: Shot): ShotAsset[] {
  return (shot.assets ?? []).filter((asset) => asset.isActive === 1);
}
```

- [ ] **Step 2: 实现节点图生成和布局合并**

Append to `src/lib/canvas/mapper.ts`:

```ts
export function buildCanvasGraph(
  project: CanvasProjectInput,
  savedLayout: { nodes?: CanvasLayoutNode[]; viewport?: CanvasViewport } = {},
): CanvasGraph {
  const nodes: CanvasNodeData[] = [];
  const edges: CanvasEdgeData[] = [];
  const projectNodeId = nodeId("project", project.id);

  nodes.push({
    id: projectNodeId,
    kind: "project",
    entityId: project.id,
    title: project.title,
    subtitle: `${project.episodes?.length ?? 0} episodes`,
    status: statusFromGenerationState(project.status),
    href: `/project/${project.id}/episodes`,
    previewUrl: project.finalVideoUrl ?? null,
    actions: ["open"],
    meta: { finalVideo: Boolean(project.finalVideoUrl) },
  });

  for (const episode of project.episodes ?? []) {
    const id = nodeId("episode", episode.id);
    nodes.push({
      id,
      kind: "episode",
      entityId: episode.id,
      parentId: project.id,
      title: `EP.${String(episode.sequence).padStart(2, "0")}`,
      subtitle: episode.title,
      status: statusFromParts({
        hasRequiredInput: true,
        hasOutput: Boolean(episode.finalVideoUrl),
        isGenerating: episode.status === "processing",
        hasFailure: episode.status === "failed",
      }),
      href: `/project/${project.id}/episodes/${episode.id}/storyboard`,
      previewUrl: episode.finalVideoUrl ?? null,
      actions: ["open", "batch-frames", "batch-video-prompts", "batch-videos", "assemble-video"],
      meta: { sequence: episode.sequence },
    });
    edges.push(edge(projectNodeId, id, "episode"));
  }

  for (const character of project.characters ?? []) {
    const id = nodeId("character", character.id);
    nodes.push({
      id,
      kind: "character",
      entityId: character.id,
      parentId: character.episodeId ?? project.id,
      title: character.name,
      subtitle: character.scope === "guest" ? "客串角色" : "主要角色",
      status: statusFromParts({
        hasRequiredInput: Boolean(character.description),
        hasOutput: Boolean(character.referenceImage),
      }),
      href: `/project/${project.id}/characters`,
      previewUrl: character.referenceImage ?? null,
      actions: ["open"],
      meta: { scope: character.scope ?? "main" },
    });
    edges.push(edge(projectNodeId, id, "character"));
    if (character.episodeId) {
      edges.push(edge(nodeId("episode", character.episodeId), id, "uses"));
    }
  }

  for (const shot of project.shots ?? []) {
    const id = nodeId("shot", shot.id);
    const shotAssets = activeAssets(shot);
    const hasVideo = shotAssets.some((asset) => asset.type.includes("video") && asset.fileUrl);
    const hasFrame = shotAssets.some((asset) => !asset.type.includes("video") && asset.fileUrl);
    nodes.push({
      id,
      kind: "shot",
      entityId: shot.id,
      parentId: shot.episodeId ?? project.id,
      title: `Shot ${shot.sequence}`,
      subtitle: shot.prompt?.slice(0, 72) || "暂无提示词",
      status: statusFromParts({
        hasRequiredInput: Boolean(shot.prompt),
        hasOutput: hasVideo,
        isGenerating: shot.status === "generating",
        hasFailure: shot.status === "failed",
        isStale: Boolean(shot.isStale),
      }),
      href: shot.episodeId
        ? `/project/${project.id}/episodes/${shot.episodeId}/storyboard?shotId=${shot.id}`
        : `/project/${project.id}/storyboard?shotId=${shot.id}`,
      previewUrl: shotAssets.find((asset) => asset.fileUrl)?.fileUrl ?? null,
      actions: ["open", "generate-frame", "generate-video-prompt", "generate-video"],
      meta: {
        sequence: shot.sequence,
        hasFrame,
        hasVideo,
        hasVideoPrompt: Boolean(shot.videoPrompt),
      },
    });
    edges.push(edge(shot.episodeId ? nodeId("episode", shot.episodeId) : projectNodeId, id, "shot"));

    for (const asset of shotAssets) {
      const assetNodeId = nodeId("asset", asset.id);
      nodes.push({
        id: assetNodeId,
        kind: "asset",
        entityId: asset.id,
        parentId: shot.id,
        title: asset.type.replaceAll("_", " "),
        subtitle: asset.status,
        status: statusFromGenerationState(asset.status),
        previewUrl: asset.fileUrl,
        actions: asset.fileUrl ? ["open"] : [],
        meta: { type: asset.type },
      });
      edges.push(edge(id, assetNodeId, "asset"));
    }
  }

  const exportNodeId = nodeId("export", project.id);
  nodes.push({
    id: exportNodeId,
    kind: "export",
    entityId: project.id,
    title: "导出",
    subtitle: project.finalVideoUrl ? "最终视频已生成" : "暂无最终视频",
    status: project.finalVideoUrl ? "completed" : "idle",
    href: `/api/projects/${project.id}/download`,
    previewUrl: project.finalVideoUrl ?? null,
    actions: ["download"],
    meta: {},
  });
  edges.push(edge(projectNodeId, exportNodeId, "export"));

  return {
    nodes,
    edges,
    layoutNodes: mergeLayout(nodes, savedLayout.nodes ?? []),
    viewport: savedLayout.viewport ?? defaultViewport,
  };
}

function mergeLayout(nodes: CanvasNodeData[], saved: CanvasLayoutNode[]): CanvasLayoutNode[] {
  const savedById = new Map(saved.map((item) => [item.id, item]));
  return nodes.map((node, index) => {
    const existing = savedById.get(node.id);
    if (existing) return existing;
    return {
      id: node.id,
      position: {
        x: (index % 5) * 280,
        y: Math.floor(index / 5) * 180,
      },
    };
  });
}
```

- [ ] **Step 3: 添加映射测试**

Create `src/lib/canvas/mapper.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCanvasGraph } from "./mapper";

describe("buildCanvasGraph", () => {
  it("maps project data into canvas nodes and edges", () => {
    const graph = buildCanvasGraph({
      id: "project-1",
      title: "Demo",
      status: "draft",
      episodes: [{ id: "episode-1", title: "Pilot", sequence: 1, status: "draft" }],
      characters: [{ id: "char-1", name: "Mira", scope: "main", referenceImage: "/uploads/mira.png" }],
      shots: [
        {
          id: "shot-1",
          sequence: 1,
          episodeId: "episode-1",
          prompt: "Mira enters the archive",
          status: "pending",
          assets: [
            {
              id: "asset-1",
              shotId: "shot-1",
              type: "first_frame",
              fileUrl: "/uploads/frame.png",
              status: "completed",
              isActive: 1,
            },
          ],
        },
      ],
    });

    expect(graph.nodes.map((node) => node.id)).toContain("project:project-1");
    expect(graph.nodes.map((node) => node.id)).toContain("episode:episode-1");
    expect(graph.nodes.map((node) => node.id)).toContain("character:char-1");
    expect(graph.nodes.map((node) => node.id)).toContain("shot:shot-1");
    expect(graph.nodes.map((node) => node.id)).toContain("asset:asset-1");
    expect(graph.edges.some((edge) => edge.source === "episode:episode-1" && edge.target === "shot:shot-1")).toBe(true);
  });

  it("preserves saved node positions and drops stale layout entries", () => {
    const graph = buildCanvasGraph(
      { id: "project-1", title: "Demo", episodes: [], characters: [], shots: [] },
      {
        nodes: [
          { id: "project:project-1", position: { x: 10, y: 20 } },
          { id: "missing:old", position: { x: 999, y: 999 } },
        ],
      },
    );

    expect(graph.layoutNodes.find((node) => node.id === "project:project-1")?.position).toEqual({ x: 10, y: 20 });
    expect(graph.layoutNodes.some((node) => node.id === "missing:old")).toBe(false);
  });
});
```

- [ ] **Step 4: 运行映射测试**

Run:

```bash
pnpm test -- src/lib/canvas/mapper.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交映射层**

Run:

```bash
git add src/lib/canvas/mapper.ts src/lib/canvas/mapper.test.ts
git commit -m "feat: map project data to canvas graph"
```

Expected: commit 成功。

---

### Task 5: 新增画布布局 API

**Files:**

- Create: `src/app/api/projects/[id]/canvas/route.ts`
- Create: `src/app/api/projects/[id]/canvas/route.test.ts`

- [ ] **Step 1: 创建布局 API**

Create `src/app/api/projects/[id]/canvas/route.ts`:

```ts
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/lib/db";
import { canvasLayouts } from "@/lib/db/schema";
import { findProject } from "@/lib/assert-project-ownership";
import type { CanvasLayoutNode, CanvasViewport } from "@/lib/canvas/types";

const defaultViewport: CanvasViewport = { x: 0, y: 0, zoom: 1 };

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function sanitizeCanvasLayoutPayload(body: {
  nodes?: unknown;
  edges?: unknown;
  viewport?: unknown;
}) {
  return {
    nodes: Array.isArray(body.nodes) ? (body.nodes as CanvasLayoutNode[]) : [],
    edges: Array.isArray(body.edges) ? body.edges : [],
    viewport:
      body.viewport &&
      typeof body.viewport === "object" &&
      "x" in body.viewport &&
      "y" in body.viewport &&
      "zoom" in body.viewport
        ? (body.viewport as CanvasViewport)
        : defaultViewport,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await findProject(request, id);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [layout] = await db
    .select()
    .from(canvasLayouts)
    .where(
      and(
        eq(canvasLayouts.projectId, id),
        eq(canvasLayouts.scope, "project"),
        isNull(canvasLayouts.episodeId),
      ),
    )
    .limit(1);

  return NextResponse.json({
    nodes: parseJson<CanvasLayoutNode[]>(layout?.nodesJson, []),
    edges: parseJson(layout?.edgesJson, []),
    viewport: parseJson<CanvasViewport>(layout?.viewportJson, defaultViewport),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await findProject(request, id);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = sanitizeCanvasLayoutPayload(await request.json());
  const [existing] = await db
    .select()
    .from(canvasLayouts)
    .where(
      and(
        eq(canvasLayouts.projectId, id),
        eq(canvasLayouts.scope, "project"),
        isNull(canvasLayouts.episodeId),
      ),
    )
    .limit(1);

  const values = {
    nodesJson: JSON.stringify(payload.nodes),
    edgesJson: JSON.stringify(payload.edges),
    viewportJson: JSON.stringify(payload.viewport),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(canvasLayouts).set(values).where(eq(canvasLayouts.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const idForLayout = ulid();
  await db.insert(canvasLayouts).values({
    id: idForLayout,
    projectId: id,
    episodeId: null,
    scope: "project",
    ...values,
  });

  return NextResponse.json({ ok: true, id: idForLayout });
}
```

- [ ] **Step 2: 添加布局负载测试**

Create `src/app/api/projects/[id]/canvas/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseJson, sanitizeCanvasLayoutPayload } from "./route";

describe("canvas layout api helpers", () => {
  it("parses json with fallback", () => {
    expect(parseJson("[1]", [])).toEqual([1]);
    expect(parseJson("bad json", [])).toEqual([]);
  });

  it("sanitizes layout payload", () => {
    const payload = sanitizeCanvasLayoutPayload({
      nodes: [{ id: "project:1", position: { x: 1, y: 2 } }],
      edges: [{ id: "a", source: "a", target: "b" }],
      viewport: { x: 3, y: 4, zoom: 0.8 },
    });

    expect(payload.nodes[0]).toEqual({ id: "project:1", position: { x: 1, y: 2 } });
    expect(payload.viewport).toEqual({ x: 3, y: 4, zoom: 0.8 });
  });
});
```

- [ ] **Step 3: 运行布局 API 测试**

Run:

```bash
pnpm test -- src/app/api/projects/[id]/canvas/route.test.ts
```

Expected: PASS。

- [ ] **Step 4: 提交布局 API**

Run:

```bash
git add src/app/api/projects/[id]/canvas/route.ts src/app/api/projects/[id]/canvas/route.test.ts
git commit -m "feat: add canvas layout api"
```

Expected: commit 成功。

---

### Task 6: 新增画布动作请求构造器

**Files:**

- Create: `src/lib/canvas/actions.ts`
- Create: `src/lib/canvas/actions.test.ts`

- [ ] **Step 1: 创建动作请求构造器**

Create `src/lib/canvas/actions.ts`:

```ts
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
  return {
    action: actionMap[input.action],
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
```

- [ ] **Step 2: 添加动作测试**

Create `src/lib/canvas/actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGenerateRequest } from "./actions";

describe("buildGenerateRequest", () => {
  it("maps a shot frame action to the existing generate API shape", () => {
    expect(
      buildGenerateRequest({
        action: "generate-frame",
        shotId: "shot-1",
        episodeId: "episode-1",
        versionId: "version-1",
        ratio: "16:9",
        modelConfig: { image: { provider: "mock" } },
      }),
    ).toEqual({
      action: "single_frame_generate",
      payload: {
        shotId: "shot-1",
        versionId: "version-1",
        ratio: "16:9",
      },
      modelConfig: { image: { provider: "mock" } },
      episodeId: "episode-1",
    });
  });

  it("maps batch videos to the existing batch action", () => {
    const request = buildGenerateRequest({
      action: "batch-videos",
      episodeId: "episode-1",
      modelConfig: {},
      overwrite: false,
    });

    expect(request.action).toBe("batch_video_generate");
    expect(request.payload).toEqual({ overwrite: false });
  });
});
```

- [ ] **Step 3: 运行动作测试**

Run:

```bash
pnpm test -- src/lib/canvas/actions.test.ts
```

Expected: PASS。

- [ ] **Step 4: 提交动作构造器**

Run:

```bash
git add src/lib/canvas/actions.ts src/lib/canvas/actions.test.ts
git commit -m "feat: add canvas action request builders"
```

Expected: commit 成功。

---

### Task 7: 新增项目级画布页面

**Files:**

- Create: `src/app/[locale]/project/[id]/canvas/page.tsx`

- [ ] **Step 1: 创建画布页面**

Create `src/app/[locale]/project/[id]/canvas/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";
import { useProjectStore } from "@/stores/project-store";

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { project, fetchProject } = useProjectStore();
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [layout, setLayout] = useState<{ nodes?: unknown[]; viewport?: { x: number; y: number; zoom: number } }>({});

  useEffect(() => {
    fetchProject(id);
  }, [id, fetchProject]);

  useEffect(() => {
    let canceled = false;
    async function loadLayout() {
      const res = await fetch(`/api/projects/${id}/canvas`);
      const data = await res.json();
      if (!canceled) {
        setLayout(data);
        setLoadingLayout(false);
      }
    }
    loadLayout();
    return () => {
      canceled = true;
    };
  }, [id]);

  if (!project || loadingLayout) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CanvasWorkspace
      project={project}
      initialLayout={layout}
      onSaveLayout={async (payload) => {
        await fetch(`/api/projects/${id}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }}
    />
  );
}
```

- [ ] **Step 2: 运行 lint，确认缺少组件的失败点**

Run:

```bash
pnpm lint
```

Expected: 这里可以因为 `CanvasWorkspace` 尚未创建而失败。不要提交，继续 Task 8。

---

### Task 8: 新增画布组件

**Files:**

- Create: `src/components/canvas/canvas-workspace.tsx`
- Create: `src/components/canvas/canvas-node.tsx`
- Create: `src/components/canvas/canvas-inspector.tsx`
- Create: `src/components/canvas/canvas-toolbar.tsx`
- Create: `src/components/canvas/canvas-resource-rail.tsx`

- [ ] **Step 1: 创建节点渲染组件**

Create `src/components/canvas/canvas-node.tsx`:

```tsx
import { Handle, Position, type NodeProps } from "reactflow";
import type { CanvasNodeData } from "@/lib/canvas/types";

const statusClass: Record<CanvasNodeData["status"], string> = {
  idle: "border-slate-200 bg-white",
  ready: "border-blue-200 bg-blue-50",
  running: "border-amber-200 bg-amber-50",
  completed: "border-emerald-200 bg-emerald-50",
  failed: "border-red-200 bg-red-50",
};

export function CanvasNode({ data }: NodeProps<CanvasNodeData>) {
  return (
    <div className={`w-[220px] rounded-lg border p-3 shadow-sm ${statusClass[data.status]}`}>
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-semibold text-[--text-primary]">{data.title}</div>
      <div className="mt-1 line-clamp-2 text-xs text-[--text-secondary]">{data.subtitle}</div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-[--text-muted]">{data.kind}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

- [ ] **Step 2: 创建顶部工具栏**

Create `src/components/canvas/canvas-toolbar.tsx`:

```tsx
import { Button } from "@/components/ui/button";

interface CanvasToolbarProps {
  filter: "all" | "failed" | "unfinished";
  onFilterChange: (filter: "all" | "failed" | "unfinished") => void;
  onAutoLayout: () => void;
  onSave: () => void;
}

export function CanvasToolbar({ filter, onFilterChange, onAutoLayout, onSave }: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-[--border-subtle] bg-white px-3 py-2">
      <Button variant={filter === "all" ? "default" : "outline"} onClick={() => onFilterChange("all")}>全部</Button>
      <Button variant={filter === "failed" ? "default" : "outline"} onClick={() => onFilterChange("failed")}>失败</Button>
      <Button variant={filter === "unfinished" ? "default" : "outline"} onClick={() => onFilterChange("unfinished")}>未完成</Button>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" onClick={onAutoLayout}>自动排列</Button>
        <Button onClick={onSave}>保存布局</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建右侧详情栏**

Create `src/components/canvas/canvas-inspector.tsx`:

```tsx
import Link from "next/link";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CanvasActionKind, CanvasNodeData } from "@/lib/canvas/types";

interface CanvasInspectorProps {
  node: CanvasNodeData | null;
  onRunAction: (action: CanvasActionKind, node: CanvasNodeData) => void;
}

export function CanvasInspector({ node, onRunAction }: CanvasInspectorProps) {
  const locale = useLocale();

  if (!node) {
    return <aside className="w-80 border-l border-[--border-subtle] bg-white p-4 text-sm text-[--text-muted]">选择一个节点</aside>;
  }

  return (
    <aside className="w-80 overflow-y-auto border-l border-[--border-subtle] bg-white p-4">
      <h2 className="font-display text-lg font-semibold">{node.title}</h2>
      <p className="mt-1 text-sm text-[--text-secondary]">{node.subtitle}</p>
      <p className="mt-3 text-xs uppercase tracking-wide text-[--text-muted]">{node.status}</p>
      {node.href && node.actions.includes("open") && (
        <Link className="mt-4 inline-flex text-sm text-primary" href={`/${locale}${node.href}`}>
          打开原页面
        </Link>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {node.actions
          .filter((action) => action !== "open")
          .map((action) => (
            <Button key={action} variant="outline" onClick={() => onRunAction(action, node)}>
              {action}
            </Button>
          ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: 创建左侧资源栏**

Create `src/components/canvas/canvas-resource-rail.tsx`:

```tsx
import type { CanvasNodeData } from "@/lib/canvas/types";

interface CanvasResourceRailProps {
  nodes: CanvasNodeData[];
  onSelect: (nodeId: string) => void;
}

export function CanvasResourceRail({ nodes, onSelect }: CanvasResourceRailProps) {
  const groups = ["episode", "character", "shot", "asset"] as const;
  const labels = { episode: "分集", character: "角色", shot: "镜头", asset: "素材" };

  return (
    <aside className="w-64 overflow-y-auto border-r border-[--border-subtle] bg-white p-3">
      {groups.map((group) => (
        <section key={group} className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--text-muted]">{labels[group]}</h2>
          <div className="space-y-1">
            {nodes.filter((node) => node.kind === group).map((node) => (
              <button
                key={node.id}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[--surface]"
                onClick={() => onSelect(node.id)}
              >
                {node.title}
              </button>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
```

- [ ] **Step 5: 创建画布主组件，并保存当前拖拽位置和当前视口**

Create `src/components/canvas/canvas-workspace.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { buildGenerateRequest } from "@/lib/canvas/actions";
import { buildCanvasGraph, type CanvasProjectInput } from "@/lib/canvas/mapper";
import type { CanvasActionKind, CanvasLayoutNode, CanvasNodeData, CanvasViewport } from "@/lib/canvas/types";
import { useModelStore } from "@/stores/model-store";
import { CanvasInspector } from "./canvas-inspector";
import { CanvasNode } from "./canvas-node";
import { CanvasResourceRail } from "./canvas-resource-rail";
import { CanvasToolbar } from "./canvas-toolbar";

const nodeTypes = { canvasNode: CanvasNode };

interface CanvasWorkspaceProps {
  project: CanvasProjectInput;
  initialLayout: { nodes?: CanvasLayoutNode[]; viewport?: CanvasViewport };
  onSaveLayout: (payload: { nodes: CanvasLayoutNode[]; edges: Edge[]; viewport: CanvasViewport }) => Promise<void>;
}

function toFlowNodes(graph: ReturnType<typeof buildCanvasGraph>): Node<CanvasNodeData>[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: "canvasNode",
    position: graph.layoutNodes.find((layout) => layout.id === node.id)?.position ?? { x: 0, y: 0 },
    data: node,
  }));
}

function toFlowEdges(graph: ReturnType<typeof buildCanvasGraph>): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));
}

export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasWorkspaceInner({ project, initialLayout, onSaveLayout }: CanvasWorkspaceProps) {
  const getModelConfig = useModelStore((state) => state.getModelConfig);
  const { getViewport, fitView } = useReactFlow();
  const [filter, setFilter] = useState<"all" | "failed" | "unfinished">("all");
  const [selectedNode, setSelectedNode] = useState<CanvasNodeData | null>(null);
  const graph = useMemo(() => buildCanvasGraph(project, initialLayout), [project, initialLayout]);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNodeData>(toFlowNodes(graph));
  const [edges, setEdges] = useEdgesState(toFlowEdges(graph));

  useEffect(() => {
    setNodes(toFlowNodes(graph));
    setEdges(toFlowEdges(graph));
  }, [graph, setEdges, setNodes]);

  const visibleNodeIds = useMemo(() => {
    return new Set(
      nodes
        .filter((node) => {
          if (filter === "failed") return node.data.status === "failed";
          if (filter === "unfinished") return node.data.status !== "completed";
          return true;
        })
        .map((node) => node.id),
    );
  }, [filter, nodes]);

  const visibleNodes = nodes.filter((node) => visibleNodeIds.has(node.id));
  const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

  function currentLayoutNodes(): CanvasLayoutNode[] {
    return nodes.map((node) => ({
      id: node.id,
      position: node.position,
    }));
  }

  function autoLayout() {
    setNodes((current) =>
      current.map((node, index) => ({
        ...node,
        position: {
          x: (index % 5) * 280,
          y: Math.floor(index / 5) * 180,
        },
      })),
    );
    requestAnimationFrame(() => fitView({ padding: 0.2 }));
  }

  async function saveLayout() {
    await onSaveLayout({
      nodes: currentLayoutNodes(),
      edges,
      viewport: getViewport(),
    });
    toast.success("画布布局已保存");
  }

  async function runAction(action: CanvasActionKind, node: CanvasNodeData) {
    if (action === "download" && node.href) {
      window.open(node.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "open") return;

    const body = buildGenerateRequest({
      action,
      shotId: node.kind === "shot" ? node.entityId : undefined,
      episodeId: node.kind === "episode" ? node.entityId : undefined,
      ratio: "16:9",
      modelConfig: getModelConfig(),
    });
    const res = await apiFetch(`/api/projects/${project.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("画布动作启动失败");
      return;
    }
    toast.success("画布动作已启动");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[--surface]">
      <CanvasResourceRail nodes={graph.nodes} onSelect={(nodeId) => setSelectedNode(graph.nodes.find((node) => node.id === nodeId) ?? null)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CanvasToolbar filter={filter} onFilterChange={setFilter} onAutoLayout={autoLayout} onSave={saveLayout} />
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            defaultViewport={graph.viewport}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => setSelectedNode(node.data)}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>
      <CanvasInspector node={selectedNode} onRunAction={runAction} />
    </div>
  );
}
```

- [ ] **Step 6: 运行 lint**

Run:

```bash
pnpm lint
```

Expected: 没有新的画布组件错误。

- [ ] **Step 7: 提交页面和组件**

Run:

```bash
git add src/app/[locale]/project/[id]/canvas/page.tsx src/components/canvas
git commit -m "feat: add project canvas workspace"
```

Expected: commit 成功。

---

### Task 9: 增加画布入口和翻译

**Files:**

- Modify: `src/app/[locale]/project/[id]/layout.tsx`
- Modify: `src/components/editor/project-nav.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`
- Modify: `messages/ja.json`
- Modify: `messages/ko.json`

- [ ] **Step 1: 项目顶部栏增加画布入口**

在 `src/app/[locale]/project/[id]/layout.tsx` 的 lucide 导入中加入 `Network`：

```ts
import { ArrowLeft, Loader2, Settings, Wand2, Network } from "lucide-react";
```

在顶部栏右侧按钮区，放在提示词按钮前：

```tsx
<Link
  href={`/${locale}/project/${id}/canvas`}
  title="画布"
  className="flex h-8 w-8 items-center justify-center rounded-lg text-[--text-muted] transition-all hover:bg-[--surface] hover:text-[--text-primary]"
>
  <Network className="h-4 w-4" />
</Link>
```

- [ ] **Step 2: 分集工作流侧边栏增加画布入口**

在 `src/components/editor/project-nav.tsx` 中把导入改为：

```ts
import { FileText, Users, Film, Play, ArrowLeft, Network } from "lucide-react";
```

把：

```ts
const icons = [FileText, Users, Film, Play];
```

改为：

```ts
const icons = [Network, FileText, Users, Film, Play];
```

把 `tabs` 改为：

```ts
const tabs = [
  { key: "canvas", href: `/${locale}/project/${projectId}/canvas`, num: 0 },
  { key: "script", href: `${basePath}/script`, num: 1 },
  { key: "characters", href: `${basePath}/characters`, num: 2 },
  { key: "storyboard", href: `${basePath}/storyboard`, num: 3 },
  { key: "preview", href: `${basePath}/preview`, num: 4 },
] as const;
```

- [ ] **Step 3: 增加翻译 key**

在每个 `messages/*.json` 的 `"project"` 对象内增加 `canvas`。

`messages/zh.json`:

```json
"canvas": "画布"
```

`messages/en.json`:

```json
"canvas": "Canvas"
```

`messages/ja.json`:

```json
"canvas": "キャンバス"
```

`messages/ko.json`:

```json
"canvas": "캔버스"
```

- [ ] **Step 4: 运行 lint**

Run:

```bash
pnpm lint
```

Expected: 没有导航或翻译 JSON 语法错误。

- [ ] **Step 5: 提交导航入口**

Run:

```bash
git add src/app/[locale]/project/[id]/layout.tsx src/components/editor/project-nav.tsx messages/zh.json messages/en.json messages/ja.json messages/ko.json
git commit -m "feat: add canvas navigation"
```

Expected: commit 成功。

---

### Task 10: 手动验收

**Files:**

- Optional Create: `docs/canvas-workspace-qa.md`

- [ ] **Step 1: 启动应用**

Run:

```bash
pnpm dev
```

Expected: Next 应用启动，默认可在 `http://localhost:3000` 访问。如果端口被占用，按 Next 输出的实际端口访问。

- [ ] **Step 2: 打开项目画布**

Open:

```text
http://localhost:3000/zh/project/<projectId>/canvas
```

Expected:

- 画布页能加载。
- 项目节点可见。
- 有数据时能看到分集、角色、镜头、素材、导出节点。
- 左侧资源栏列出分集、角色、镜头、素材。
- 点击节点后右侧详情栏显示节点信息。

- [ ] **Step 3: 验证布局持久化**

移动一个或多个节点，点击“保存布局”，刷新页面。

Expected: 节点位置保持移动后的位置，不回到初始自动排列位置。

- [ ] **Step 4: 验证视口持久化**

缩放和平移画布，点击“保存布局”，刷新页面。

Expected: 画布恢复到保存时的缩放比例和平移位置。

- [ ] **Step 5: 验证筛选**

点击“失败”和“未完成”。

Expected: 节点图只显示匹配状态的节点，页面不崩溃。

- [ ] **Step 6: 验证跳转**

选中分集、角色或镜头节点，点击“打开原页面”。

Expected: 跳转到对应 AIComicBuilder 现有页面。

- [ ] **Step 7: 验证生成动作**

选中镜头节点，点击 `generate-frame`。

Expected: 请求发送到 `/api/projects/[id]/generate`，请求体里的 `action` 是 `single_frame_generate`。如果模型配置缺失，现有 API 返回用户可见错误；画布不吞掉错误。

- [ ] **Step 8: 验证现有页面未被破坏**

Open:

```text
/zh/project/<projectId>/episodes
/zh/project/<projectId>/characters
/zh/project/<projectId>/episodes/<episodeId>/storyboard
/zh/project/<projectId>/episodes/<episodeId>/preview
```

Expected: 现有页面仍能渲染和操作。

- [ ] **Step 9: 记录 QA 结果**

如果需要记录验收结果，Create `docs/canvas-workspace-qa.md`:

```md
# Canvas Workspace QA

## Commands

- `pnpm lint`
- `pnpm test`
- `pnpm dev`

## Manual Checks

- Canvas route loaded.
- Graph nodes rendered.
- Inspector opened.
- Navigation worked.
- Layout persisted.
- Viewport persisted.
- Existing pages still rendered.
```

Commit:

```bash
git add docs/canvas-workspace-qa.md
git commit -m "docs: record canvas workspace qa"
```

Expected: 如果创建了 QA 文档，commit 成功。

---

## 自检结果

### 需求覆盖

- 新增画布路由：Task 7。
- 新增项目顶部栏和分集侧边栏画布入口：Task 9。
- 新增 `canvas_layouts` 表和迁移：Task 2。
- 新增布局 GET / PUT API：Task 5。
- 新增业务数据到节点图映射：Task 4。
- 新增节点状态计算：Task 3。
- 新增画布 UI：Task 8。
- 新增核心动作，并复用现有生成 API：Task 6 和 Task 8。
- 验证布局拖拽位置持久化：Task 8 和 Task 10。
- 验证视口缩放/平移持久化：Task 8 和 Task 10。
- 验证现有页面仍可用：Task 10。

### 已修正的计划问题

- 原计划只保存 `graph.viewport`，这会保存初始视口而不是用户当前视口；已改为在 `CanvasWorkspaceInner.saveLayout()` 中使用 `useReactFlow().getViewport()`。
- 原计划只提到 `ProjectNav`，但项目级画布不在分集 layout 内；已增加 `src/app/[locale]/project/[id]/layout.tsx` 顶部栏入口。
- 现有项目/分集聚合接口使用 `and(...)` 但导入缺失；已纳入 Task 1，避免画布依赖聚合接口时直接运行时报错。

### 有意留到后续的内容

- 分集级画布路由。
- 更强的自动布局算法。
- Playwright 视觉回归测试。
- 桌面端打包。
- 用户自定义连线驱动业务逻辑。

### 占位符扫描

本计划没有 `TBD`、`TODO`、`placeholder`。代码路径、命令、关键类型、关键组件和测试样例均已写明。
