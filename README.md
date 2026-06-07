# AI_DRAWING

AI_DRAWING 是面向 AI 漫剧和视觉内容创作者的一站式创作项目。当前版本以 AIComicBuilder 的成熟业务链路作为参考素材，保留剧本、角色、分镜、帧图、视频生成、预览合成、多模型配置等核心能力，并计划新增画布工作区，让用户可以用节点画布方式查看和操作完整创作流程。

## 项目目标

- 保留页面式工作台：适合剧本、角色、分镜、预览、模型和提示词的精细编辑。
- 新增画布式工作区：适合全局总览、节点操作、批量生成、失败重试和跨页面跳转。
- 统一数据来源：画布只保存布局和 UI 状态，不复制项目、分集、镜头等业务数据。
- 支持多模型链路：沿用现有文本、图像、视频模型适配层，并逐步优化为更容易配置和扩展的结构。

## 当前已迁入的核心能力

- 项目管理
- 剧本导入、解析和生成
- 分集管理
- 角色管理和参考图生成
- 分镜生成与分镜看板
- 首尾帧 / 参考图生成
- 视频提示词生成
- 视频生成与合成
- 素材下载
- 多语言界面
- SQLite + Drizzle 数据持久化
- 本地上传和生成资源管理

## 即将实现的画布工作区

画布第一版会新增：

- 项目、分集、角色、镜头、素材、操作和导出节点
- 左侧资源栏
- 中央 React Flow 节点画布
- 右侧节点详情栏
- 自动排列、筛选失败、筛选未完成、保存布局
- 节点快捷跳转到原页面
- 节点调用现有生成 API

详细设计和实施计划见：

- `docs/superpowers/specs/2026-06-07-aicomicbuilder-canvas-integration-design.md`
- `docs/superpowers/plans/2026-06-07-aicomicbuilder-canvas-workspace.md`

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 框架 | Next.js 16 App Router |
| 前端 | React 19, Tailwind CSS 4, Zustand, Base UI |
| 国际化 | next-intl |
| 数据库 | SQLite + Drizzle ORM |
| AI 文本 | OpenAI / Gemini / AI SDK |
| AI 图像 | OpenAI / Gemini Imagen / Kling 等 |
| AI 视频 | Seedance / Kling / Veo / Wan 等 |
| 视频处理 | FFmpeg |
| 包管理 | pnpm |

## 本地启动

安装依赖：

```bash
pnpm install
```

准备环境变量：

```bash
cp .env.example .env
```

初始化数据库：

```bash
pnpm drizzle-kit push
```

启动开发服务：

```bash
pnpm dev
```

默认访问：

```text
http://localhost:3000
```

## 目录说明

```text
src/                 应用源码
src/app/             Next.js App Router 页面和 API
src/components/      UI 和业务组件
src/lib/             数据库、AI、任务队列、工具函数
src/stores/          Zustand 状态管理
drizzle/             数据库迁移
messages/            多语言文案
public/              静态资源
docs/superpowers/    当前融合设计和实施计划
```

## 迁入说明

AI_DRAWING 不是直接在旧项目目录上二开。旧项目只作为实现参考和素材来源。当前仓库会逐步裁剪无关内容，保留有价值的创作链路，并在此基础上实现自己的画布操作体验。
