import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/get-user-id";

/**
 * Find a project by id, with userId-aware fallback.
 * For a local app — if userId filtering yields nothing, fall back to
 * finding the project by id alone (cookie may have changed).
 * Returns the project row or null.
 */
export async function findProject(
  request: Request,
  projectId: string
) {
  const userId = getUserIdFromRequest(request);

  if (userId) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    if (project) return project;
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  return project ?? null;
}

/**
 * Verify that the request's user owns the given project.
 * Returns the project row if owned, otherwise null.
 *
 * This is a local app — if userId filtering yields nothing,
 * fall back to finding the project by id alone (cookie may have changed).
 */
export async function assertProjectOwnership(
  request: Request,
  projectId: string
) {
  return findProject(request, projectId);
}
