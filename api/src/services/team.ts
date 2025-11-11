import { desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import {
  chatMessages,
  ideas,
  teamProgress,
  teams,
} from "../db/schema";

export function getTeam(teamId: string) {
  return db.select().from(teams).where(eq(teams.id, teamId)).get();
}

export function getTeamChat(teamId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.teamId, teamId))
    .orderBy(chatMessages.createdAt)
    .all();
}

export function addTeamChatMessage(teamId: string, message: { userId: string; userName: string; body: string }) {
  const entry = {
    id: crypto.randomUUID(),
    teamId,
    userId: message.userId,
    userName: message.userName,
    body: message.body,
    createdAt: new Date().toISOString(),
  };
  db.insert(chatMessages).values(entry).run();
  return entry;
}

export function listIdeas(teamId: string) {
  return db
    .select()
    .from(ideas)
    .where(eq(ideas.teamId, teamId))
    .orderBy(desc(ideas.createdAt))
    .all();
}

export function createIdea(payload: {
  teamId: string;
  title: string;
  description: string;
}) {
  const entry = {
    id: crypto.randomUUID(),
    teamId: payload.teamId,
    title: payload.title,
    description: payload.description,
    votes: 0,
    createdAt: new Date().toISOString(),
  };
  db.insert(ideas).values(entry).run();
  return entry;
}

export function updateIdea(teamId: string, ideaId: string, updates: Partial<typeof ideas.$inferSelect>) {
  const idea = db
    .select()
    .from(ideas)
    .where(eq(ideas.id, ideaId))
    .get();

  if (!idea || idea.teamId !== teamId) {
    return null;
  }

  db.update(ideas)
    .set(updates)
    .where(eq(ideas.id, ideaId))
    .run();

  return db
    .select()
    .from(ideas)
    .where(eq(ideas.id, ideaId))
    .get();
}

export function getTeamProgress(teamId: string) {
  return db
    .select()
    .from(teamProgress)
    .where(eq(teamProgress.teamId, teamId))
    .get();
}

