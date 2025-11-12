import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

import { db } from "../db/client";
import { userActions, users, tasks, levels, userWeekProgress } from "../db/schema";

export type ActionType =
  | "task_submission"
  | "task_completed"
  | "week_completed"
  | "comment_created"
  | "idea_voted"
  | "chat_message"
  | "level_viewed"
  | "task_viewed";

export function logUserAction(payload: {
  userId: string;
  actionType: ActionType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const action = {
    id: crypto.randomUUID(),
    userId: payload.userId,
    actionType: payload.actionType,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    metadata: payload.metadata ?? null,
    createdAt: new Date(),
  };

  db.insert(userActions).values(action).run();
  return action;
}

export function getUserActions(userId: string, limit = 100) {
  return db
    .select()
    .from(userActions)
    .where(eq(userActions.userId, userId))
    .orderBy(desc(userActions.createdAt))
    .limit(limit)
    .all();
}

export function getTaskCompletionStats(taskId?: string) {
  const conditions = [eq(userActions.actionType, "task_completed")];
  if (taskId) {
    conditions.push(eq(tasks.id, taskId));
  }

  return db
    .select({
      taskId: tasks.id,
      taskTitle: tasks.title,
      taskType: tasks.type,
      levelId: tasks.levelId,
      levelWeek: levels.week,
      completedCount: sql<number>`COUNT(DISTINCT ${userActions.userId})`,
      totalSubmissions: sql<number>`COUNT(${userActions.id})`,
    })
    .from(userActions)
    .innerJoin(tasks, eq(userActions.entityId, tasks.id))
    .innerJoin(levels, eq(tasks.levelId, levels.id))
    .where(and(...conditions))
    .groupBy(tasks.id)
    .all();
}

export function getUserProgressStats(userId?: string) {
  const baseQuery = db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      tasksCompleted: sql<number>`COUNT(DISTINCT CASE WHEN ${userActions.actionType} = 'task_completed' THEN ${userActions.entityId} END)`,
      weeksCompleted: sql<number>`COUNT(DISTINCT CASE WHEN ${userActions.actionType} = 'week_completed' THEN ${userActions.entityId} END)`,
      totalActions: sql<number>`COUNT(${userActions.id})`,
      lastActivityAt: sql<Date>`MAX(${userActions.createdAt})`,
    })
    .from(userActions)
    .innerJoin(users, eq(userActions.userId, users.id))
    .groupBy(users.id);

  if (userId) {
    return baseQuery
      .where(eq(users.id, userId))
      .all();
  }

  return baseQuery.all();
}

export function getWeeklyActivityStats(startDate?: Date, endDate?: Date) {
  const conditions = [];
  if (startDate) {
    conditions.push(gte(userActions.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(userActions.createdAt, endDate));
  }

  const baseQuery = db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', datetime(${userActions.createdAt}, 'unixepoch'))`,
      actionType: userActions.actionType,
      count: sql<number>`COUNT(${userActions.id})`,
    })
    .from(userActions)
    .groupBy(
      sql`strftime('%Y-%m-%d', datetime(${userActions.createdAt}, 'unixepoch'))`,
      userActions.actionType,
    );

  if (conditions.length > 0) {
    return baseQuery.where(and(...conditions)).all();
  }

  return baseQuery.all();
}

export function getTopUsersByActivity(limit = 10) {
  return db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      totalActions: sql<number>`COUNT(${userActions.id})`,
      tasksCompleted: sql<number>`COUNT(DISTINCT CASE WHEN ${userActions.actionType} = 'task_completed' THEN ${userActions.entityId} END)`,
    })
    .from(userActions)
    .innerJoin(users, eq(userActions.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(sql`COUNT(${userActions.id})`))
    .limit(limit)
    .all();
}

export function getTaskCompletionByWeek() {
  return db
    .select({
      week: levels.week,
      levelTitle: levels.title,
      tasksCompleted: sql<number>`COUNT(DISTINCT ${userActions.entityId})`,
      usersCompleted: sql<number>`COUNT(DISTINCT ${userActions.userId})`,
    })
    .from(userActions)
    .innerJoin(tasks, eq(userActions.entityId, tasks.id))
    .innerJoin(levels, eq(tasks.levelId, levels.id))
    .where(eq(userActions.actionType, "task_completed"))
    .groupBy(levels.week, levels.id)
    .orderBy(levels.week)
    .all();
}

export function getUserActivityTimeline(userId: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', datetime(${userActions.createdAt}, 'unixepoch'))`,
      actionType: userActions.actionType,
      count: sql<number>`COUNT(${userActions.id})`,
    })
    .from(userActions)
    .where(
      and(
        eq(userActions.userId, userId),
        gte(userActions.createdAt, startDate),
      ),
    )
    .groupBy(
      sql`strftime('%Y-%m-%d', datetime(${userActions.createdAt}, 'unixepoch'))`,
      userActions.actionType,
    )
    .orderBy(userActions.createdAt)
    .all();
}

