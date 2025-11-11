import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { levels, tasks } from "../db/schema";

export function getCurrentLevel() {
  return db
    .select()
    .from(levels)
    .orderBy(levels.opensAt)
    .limit(1)
    .get();
}

export function getLevelByWeek(week: number) {
  return db.select().from(levels).where(eq(levels.week, week)).get();
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

