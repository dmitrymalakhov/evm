import { and, desc, eq, gte, gt, isNull, lte } from "drizzle-orm";

import { db } from "../db/client";
import { iterations, levels, tasks } from "../db/schema";

function nowDate() {
  return new Date();
}

export function getActiveIteration() {
  const now = nowDate();
  // Get all iterations ordered by start date (most recent first)
  const allIterations = db
    .select()
    .from(iterations)
    .orderBy(desc(iterations.startsAt))
    .all();

  if (allIterations.length === 0) {
    return null;
  }

  // When admin sets an active week, we want to prioritize that iteration
  // The key insight: we should check if there's a level matching the iteration's currentWeek
  // This indicates the iteration has been properly set up and activated
  
  // First, try to find an iteration that has a level matching its currentWeek
  // This ensures that when admin sets an active week, that iteration is used
  for (const iter of allIterations) {
    // Check for levels with matching iterationId and week
    const matchingLevel = db
      .select()
      .from(levels)
      .where(
        and(
          eq(levels.iterationId, iter.id),
          eq(levels.week, iter.currentWeek),
        ),
      )
      .get();
    
    if (matchingLevel) {
      return iter;
    }
  }

  // Fallback: check for levels with null iterationId that match any iteration's currentWeek
  // This handles cases where levels were created without iterationId
  for (const iter of allIterations) {
    const levelWithNullIteration = db
      .select()
      .from(levels)
      .where(
        and(
          isNull(levels.iterationId),
          eq(levels.week, iter.currentWeek),
        ),
      )
      .get();
    
    if (levelWithNullIteration) {
      return iter;
    }
  }

  // Fallback: if no iteration has a matching level, return null
  // This prevents returning an iteration without a corresponding level
  // which would cause "no tasks available" errors for users
  return null;
}

export function getIterationById(iterationId: string) {
  return db
    .select()
    .from(iterations)
    .where(eq(iterations.id, iterationId))
    .get();
}

export function getCurrentLevel() {
  const iteration = getActiveIteration();
  if (!iteration) {
    return null;
  }

  // First, try to find a level with matching iterationId and week
  const levelWithIteration = db
    .select()
    .from(levels)
    .where(
      and(
        eq(levels.iterationId, iteration.id),
        eq(levels.week, iteration.currentWeek),
      ),
    )
    .get();

  if (levelWithIteration) {
    return levelWithIteration;
  }

  // Fallback: check for levels with null iterationId that match the week
  // This handles cases where levels were created without iterationId
  return db
    .select()
    .from(levels)
    .where(
      and(
        isNull(levels.iterationId),
        eq(levels.week, iteration.currentWeek),
      ),
    )
    .get();
}

export function getLevelByWeek(week: number, iterationId?: string) {
  const iteration = iterationId
    ? db
        .select()
        .from(iterations)
        .where(eq(iterations.id, iterationId))
        .get()
    : getActiveIteration();

  if (!iteration) {
    return null;
  }

  // First, try to find a level with matching iterationId and week
  const levelWithIteration = db
    .select()
    .from(levels)
    .where(
      and(
        eq(levels.iterationId, iteration.id),
        eq(levels.week, week),
      ),
    )
    .get();

  if (levelWithIteration) {
    return levelWithIteration;
  }

  // Fallback: check for levels with null iterationId that match the week
  // This handles cases where levels were created without iterationId
  return db
    .select()
    .from(levels)
    .where(
      and(
        isNull(levels.iterationId),
        eq(levels.week, week),
      ),
    )
    .get();
}

export function getLevelById(id: string) {
  return db.select().from(levels).where(eq(levels.id, id)).get();
}

export function listLevels() {
  return db.select().from(levels).all();
}

export function upsertLevel(data: typeof levels.$inferSelect) {
  const existing = getLevelById(data.id);
  if (existing) {
    db.update(levels)
      .set({
        iterationId: data.iterationId ?? existing.iterationId,
        title: data.title,
        week: data.week,
        state: data.state,
        opensAt: data.opensAt,
        closesAt: data.closesAt,
        storyline: data.storyline,
        hint: data.hint,
      })
      .where(eq(levels.id, data.id))
      .run();
    return getLevelById(data.id);
  }
  db.insert(levels).values(data).run();
  return getLevelById(data.id);
}

export function updateLevel(id: string, data: Partial<typeof levels.$inferSelect>) {
  db.update(levels)
    .set(data)
    .where(eq(levels.id, id))
    .run();
  return getLevelById(id);
}

export function getTasksForLevel(levelId: string) {
  return db.select().from(tasks).where(eq(tasks.levelId, levelId)).all();
}

export function addTask(task: typeof tasks.$inferInsert) {
  db.insert(tasks).values(task).run();
  return db.select().from(tasks).where(eq(tasks.id, task.id)).get();
}

export function getTask(taskId: string) {
  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export function updateTask(
  taskId: string,
  data: Partial<typeof tasks.$inferSelect>,
) {
  db.update(tasks)
    .set(data)
    .where(eq(tasks.id, taskId))
    .run();
  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export function deleteTask(taskId: string) {
  const task = getTask(taskId);
  if (!task) {
    return null;
  }
  db.delete(tasks)
    .where(eq(tasks.id, taskId))
    .run();
  return task;
}

export function listIterations() {
  return db.select().from(iterations).orderBy(desc(iterations.startsAt)).all();
}

export function setIterationCurrentWeek(iterationId: string, week: number) {
  db.update(iterations)
    .set({ currentWeek: week })
    .where(eq(iterations.id, iterationId))
    .run();
  return getIterationById(iterationId);
}

