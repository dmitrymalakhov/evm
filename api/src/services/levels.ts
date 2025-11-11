import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "../db/client";
import { iterations, levels, tasks } from "../db/schema";

function nowDate() {
  return new Date();
}

export function getActiveIteration() {
  const now = nowDate();
  const active =
    db
      .select()
      .from(iterations)
      .where(and(lte(iterations.startsAt, now), gte(iterations.endsAt, now)))
      .limit(1)
      .get() ??
    db
      .select()
      .from(iterations)
      .orderBy(desc(iterations.startsAt))
      .limit(1)
      .get();
  return active ?? null;
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

  return db
    .select()
    .from(levels)
    .where(
      and(
        eq(levels.iterationId, iteration.id),
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

  return db
    .select()
    .from(levels)
    .where(
      and(
        eq(levels.iterationId, iteration.id),
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

