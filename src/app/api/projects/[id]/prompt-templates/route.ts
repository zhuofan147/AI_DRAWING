import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promptTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { findProject } from "@/lib/assert-project-ownership";
import { getUserIdFromRequest } from "@/lib/get-user-id";

// GET: list all project-level overrides for user and project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserIdFromRequest(request);

  const project = await findProject(request, id);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const templates = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.userId, userId),
        eq(promptTemplates.scope, "project"),
        eq(promptTemplates.projectId, id)
      )
    );

  return NextResponse.json(templates);
}
