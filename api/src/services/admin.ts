import { desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { adminMetrics, comments, taskSubmissions, users, tasks } from "../db/schema";

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

export function listTaskSubmissions() {
  return db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      userId: taskSubmissions.userId,
      payload: taskSubmissions.payload,
      status: taskSubmissions.status,
      hint: taskSubmissions.hint,
      message: taskSubmissions.message,
      createdAt: taskSubmissions.createdAt,
      userName: users.name,
      userEmail: users.email,
      taskTitle: tasks.title,
      taskType: tasks.type,
    })
    .from(taskSubmissions)
    .leftJoin(users, eq(taskSubmissions.userId, users.id))
    .leftJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .orderBy(desc(taskSubmissions.createdAt))
    .all();
}

export function getTaskSubmissionById(submissionId: string) {
  return db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      userId: taskSubmissions.userId,
      payload: taskSubmissions.payload,
      status: taskSubmissions.status,
      hint: taskSubmissions.hint,
      message: taskSubmissions.message,
      createdAt: taskSubmissions.createdAt,
      userName: users.name,
      userEmail: users.email,
      taskTitle: tasks.title,
      taskType: tasks.type,
    })
    .from(taskSubmissions)
    .leftJoin(users, eq(taskSubmissions.userId, users.id))
    .leftJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .where(eq(taskSubmissions.id, submissionId))
    .get();
}

export function updateTaskSubmission(
  submissionId: string,
  data: {
    status?: string;
    hint?: string | null;
    message?: string | null;
  },
) {
  db.update(taskSubmissions)
    .set(data)
    .where(eq(taskSubmissions.id, submissionId))
    .run();

  return getTaskSubmissionById(submissionId);
}

