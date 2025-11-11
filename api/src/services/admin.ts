import { desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { adminMetrics, comments } from "../db/schema";

export function getAdminMetrics() {
  return db.select().from(adminMetrics).limit(1).get();
}

export function listComments() {
  return db.select().from(comments).orderBy(desc(comments.createdAt)).all();
}

export function hideComment(commentId: string) {
  db.update(comments)
    .set({ status: "hidden" })
    .where(eq(comments.id, commentId))
    .run();

  return db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .get();
}

