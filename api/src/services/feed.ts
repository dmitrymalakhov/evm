import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  comments,
  taskSubmissions,
  thoughts,
} from "../db/schema.js";
import { logUserAction } from "./analytics.js";

export function getThoughtFeed() {
  return {
    thoughts: db.select().from(thoughts).orderBy(desc(thoughts.createdAt)).all(),
    comments: db.select().from(comments).orderBy(desc(comments.createdAt)).all(),
  };
}

export function createThought(text: string) {
  const entry = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  };
  db.insert(thoughts).values(entry).run();
  return entry;
}

export function updateThought(id: string, text: string) {
  const updated = db
    .update(thoughts)
    .set({ text })
    .where(eq(thoughts.id, id))
    .returning()
    .get();
  return updated;
}

export function deleteThought(id: string) {
  db.delete(thoughts).where(eq(thoughts.id, id)).run();
}

export function createComment(payload: {
  entityType: "task" | "feed" | "idea";
  entityId: string;
  parentId?: string;
  userId: string;
  body: string;
}) {
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "ok" as const,
    ...payload,
  };
  db.insert(comments).values(entry).run();
  
  // Log user action
  logUserAction({
    userId: payload.userId,
    actionType: "comment_created",
    entityType: payload.entityType,
    entityId: payload.entityId,
    metadata: {
      parentId: payload.parentId,
      commentLength: payload.body.length,
    },
  });
  
  return entry;
}

export function saveTaskSubmission(payload: {
  taskId: string;
  userId: string;
  body: Record<string, unknown>;
}) {
  console.log("🔵 [SAVE SUBMISSION] Saving task submission:", {
    taskId: payload.taskId,
    userId: payload.userId,
    body: payload.body,
    photos: payload.body.photos,
    photosType: typeof payload.body.photos,
    isArray: Array.isArray(payload.body.photos),
  });
  
  const submission = {
    id: crypto.randomUUID(),
    taskId: payload.taskId,
    userId: payload.userId,
    payload: payload.body,
    status: "pending",
    hint: null,
    message: null,
    createdAt: new Date().toISOString(),
  };
  
  console.log("🔵 [SAVE SUBMISSION] Submission object before insert:", {
    id: submission.id,
    payload: submission.payload,
    payloadType: typeof submission.payload,
  });
  
  db.insert(taskSubmissions).values(submission).run();
  
  console.log("🟢 [SAVE SUBMISSION] Submission saved successfully");
  
  // Log user action
  logUserAction({
    userId: payload.userId,
    actionType: "task_submission",
    entityType: "task",
    entityId: payload.taskId,
    metadata: {
      submissionId: submission.id,
      status: submission.status,
    },
  });
  
  return {
    status: submission.status,
    hint: submission.hint ?? undefined,
    message: submission.message ?? undefined,
  };
}

export function getUserTaskSubmissions(userId: string, taskIds?: string[]) {
  if (taskIds && taskIds.length > 0) {
    return db
      .select()
      .from(taskSubmissions)
      .where(
        and(
          eq(taskSubmissions.userId, userId),
          inArray(taskSubmissions.taskId, taskIds),
        ),
      )
      .orderBy(desc(taskSubmissions.createdAt))
      .all();
  }

  return db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.userId, userId))
    .orderBy(desc(taskSubmissions.createdAt))
    .all();
}

