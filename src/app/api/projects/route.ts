import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { id as genId } from "@/lib/id";
import { getUserIdFromRequest } from "@/lib/get-user-id";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  // Try with userId first; fall back to all projects (cookie may have changed)
  let allProjects = userId
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt))
    : [];
  if (allProjects.length === 0) {
    allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }
  return NextResponse.json(allProjects);
}

export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  const body = (await request.json()) as { title: string; script?: string };
  const id = genId();

  // Use existing userId if available, otherwise reuse any existing project's userId
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const [anyProject] = await db
      .select({ userId: projects.userId })
      .from(projects)
      .limit(1);
    effectiveUserId = anyProject?.userId ?? id; // fallback to generated id
  }

  const [project] = await db
    .insert(projects)
    .values({
      id,
      userId: effectiveUserId,
      title: body.title,
      script: body.script || "",
    })
    .returning();

  return NextResponse.json(project, { status: 201 });
}
