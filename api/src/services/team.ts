import { and, count, desc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
type TransactionClient = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
import {
  chatMessages,
  ideaVotes,
  ideas,
  teamProgress,
  teams,
} from "../db/schema.js";

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

type IdeaWithFlag = (typeof ideas.$inferSelect) & { userHasVoted: boolean };

export function listIdeas(teamId: string, userId?: string): IdeaWithFlag[] {
  const items = db
    .select()
    .from(ideas)
    .where(eq(ideas.teamId, teamId))
    .orderBy(desc(ideas.createdAt))
    .all();

  if (!userId) {
    return items.map((idea) => ({
      ...idea,
      userHasVoted: false,
    }));
  }

  const votedIds = new Set(
    db
      .select({ ideaId: ideaVotes.ideaId })
      .from(ideaVotes)
      .innerJoin(ideas, eq(ideaVotes.ideaId, ideas.id))
      .where(and(eq(ideas.teamId, teamId), eq(ideaVotes.userId, userId)))
      .all()
      .map((entry) => entry.ideaId),
  );

  return items.map((idea) => ({
    ...idea,
    userHasVoted: votedIds.has(idea.id),
  }));
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

export class IdeaVoteError extends Error {}

export function voteForIdea(teamId: string, ideaId: string, userId: string) {
  return db.transaction((tx: TransactionClient) => {
    const idea = tx
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .get();

    if (!idea || idea.teamId !== teamId) {
      return null;
    }

    try {
      tx.insert(ideaVotes)
        .values({
          ideaId,
          userId,
          createdAt: new Date().toISOString(),
        })
        .run();
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string" &&
        ((error as { code: string }).code.includes("SQLITE_CONSTRAINT") ||
          (error as { message: string }).message.includes("UNIQUE"))
      ) {
        throw new IdeaVoteError("already_voted");
      }
      throw error;
    }

    const totalVotes =
      tx
        .select({ value: count() })
        .from(ideaVotes)
        .where(eq(ideaVotes.ideaId, ideaId))
        .get()?.value ?? 0;

    tx.update(ideas).set({ votes: totalVotes }).where(eq(ideas.id, ideaId)).run();

    return tx
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .get();
  });
}

export function removeIdeaVote(teamId: string, ideaId: string, userId: string) {
  return db.transaction((tx: TransactionClient) => {
    const idea = tx
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .get();

    if (!idea || idea.teamId !== teamId) {
      return null;
    }

    const deleted = tx
      .delete(ideaVotes)
      .where(and(eq(ideaVotes.ideaId, ideaId), eq(ideaVotes.userId, userId)))
      .run();

    if (deleted.changes === 0) {
      throw new IdeaVoteError("not_voted");
    }

    const totalVotes =
      tx
        .select({ value: count() })
        .from(ideaVotes)
        .where(eq(ideaVotes.ideaId, ideaId))
        .get()?.value ?? 0;

    tx.update(ideas).set({ votes: totalVotes }).where(eq(ideas.id, ideaId)).run();

    return tx
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .get();
  });
}

export function getTeamProgress(teamId: string) {
  return db
    .select()
    .from(teamProgress)
    .where(eq(teamProgress.teamId, teamId))
    .get();
}

