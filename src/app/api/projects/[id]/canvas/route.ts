import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { canvasLayouts } from "@/lib/db/schema";
import { findProject } from "@/lib/assert-project-ownership";
import { id as genId } from "@/lib/id";
import type {
  CanvasEdgeData,
  CanvasLayoutNode,
  CanvasViewport,
} from "@/lib/canvas/types";

type LayoutPayload = {
  nodes: CanvasLayoutNode[];
  edges: CanvasEdgeData[];
  viewport: CanvasViewport;
};

const defaultPayload: LayoutPayload = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function sanitizeCanvasLayoutPayload(input: unknown): LayoutPayload {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  const edges = Array.isArray(body.edges) ? body.edges : [];
  const viewport = body.viewport && typeof body.viewport === "object"
    ? body.viewport as Record<string, unknown>
    : {};

  return {
    nodes: nodes.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const node = item as Record<string, unknown>;
      const id = stringValue(node.id);
      const position = node.position && typeof node.position === "object"
        ? node.position as Record<string, unknown>
        : null;
      if (!id || !position) return [];

      return [{
        id,
        position: {
          x: finiteNumber(position.x, 0),
          y: finiteNumber(position.y, 0),
        },
        ...(typeof node.collapsed === "boolean" && { collapsed: node.collapsed }),
      }];
    }),
    edges: edges.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const edge = item as Record<string, unknown>;
      const id = stringValue(edge.id);
      const source = stringValue(edge.source);
      const target = stringValue(edge.target);
      if (!id || !source || !target) return [];

      return [{
        id,
        source,
        target,
        ...(typeof edge.label === "string" && { label: edge.label }),
      }];
    }),
    viewport: {
      x: finiteNumber(viewport.x, defaultPayload.viewport.x),
      y: finiteNumber(viewport.y, defaultPayload.viewport.y),
      zoom: finiteNumber(viewport.zoom, defaultPayload.viewport.zoom),
    },
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
    );

  if (!layout) {
    return NextResponse.json(defaultPayload);
  }

  return NextResponse.json({
    nodes: parseJson(layout.nodesJson, defaultPayload.nodes),
    edges: parseJson(layout.edgesJson, defaultPayload.edges),
    viewport: parseJson(layout.viewportJson, defaultPayload.viewport),
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
    .select({ id: canvasLayouts.id })
    .from(canvasLayouts)
    .where(
      and(
        eq(canvasLayouts.projectId, id),
        eq(canvasLayouts.scope, "project"),
        isNull(canvasLayouts.episodeId),
      ),
    );

  const values = {
    nodesJson: JSON.stringify(payload.nodes),
    edgesJson: JSON.stringify(payload.edges),
    viewportJson: JSON.stringify(payload.viewport),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(canvasLayouts)
      .set(values)
      .where(eq(canvasLayouts.id, existing.id));
  } else {
    await db.insert(canvasLayouts).values({
      id: genId(),
      projectId: id,
      episodeId: null,
      scope: "project",
      ...values,
    });
  }

  return NextResponse.json(payload);
}
