import { desc } from "drizzle-orm";

import { db } from "../db/client";
import {
  comments,
  taskSubmissions,
  thoughts,
} from "../db/schema";

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
  return entry;
}

export function saveTaskSubmission(payload: {
  taskId: string;
  userId: string;
  body: Record<string, unknown>;
}) {
  const submission = {
    id: crypto.randomUUID(),
    taskId: payload.taskId,
    userId: payload.userId,
    payload: payload.body,
    status: "accepted",
    hint: "Фрагмент ключа сохранён.",
    message: null,
    createdAt: new Date().toISOString(),
  };
  db.insert(taskSubmissions).values(submission).run();
  return {
    status: submission.status,
    hint: submission.hint,
    message: submission.message ?? undefined,
  };
}

