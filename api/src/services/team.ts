import { and, count, desc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  chatMessages,
  ideaVotes,
  ideas,
  teamProgress,
  teams,
  users,
  userWeekProgress,
} from "../db/schema.js";
import { logUserAction } from "./analytics.js";

type TransactionClient = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

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
  
  // Log user action
  logUserAction({
    userId: message.userId,
    actionType: "chat_message",
    entityType: "team",
    entityId: teamId,
    metadata: {
      messageId: entry.id,
      messageLength: message.body.length,
    },
  });
  
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

export class IdeaVoteError extends Error { }

export function voteForIdea(teamId: string, ideaId: string, userId: string) {
  const result = db.transaction((tx: TransactionClient) => {
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
  
  // Log user action (outside transaction to avoid issues)
  if (result) {
    logUserAction({
      userId,
      actionType: "idea_voted",
      entityType: "idea",
      entityId: ideaId,
      metadata: {
        teamId,
        newVoteCount: result.votes,
      },
    });
  }
  
  return result;
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
  // Получаем существующий прогресс команды
  const existingProgress = db
    .select()
    .from(teamProgress)
    .where(eq(teamProgress.teamId, teamId))
    .get();

  // Получаем всех участников команды
  const teamMembers = db
    .select({
      userId: users.id,
    })
    .from(users)
    .where(eq(users.teamId, teamId))
    .all();

  // Пересчитываем командные баллы из персональных баллов всех участников
  let totalTeamPoints = 0;
  const allCompletedTasks = new Set<string>();
  // Для статистики по неделям: Map<week, { points: number, tasks: Set<string> }>
  const weeklyStatsMap = new Map<number, { points: number; tasks: Set<string> }>();

  for (const member of teamMembers) {
    // Получаем персональные баллы участника из всех недель
    const userProgress = db
      .select({
        pointsEarned: userWeekProgress.pointsEarned,
        completedTasks: userWeekProgress.completedTasks,
        week: userWeekProgress.week,
      })
      .from(userWeekProgress)
      .where(eq(userWeekProgress.userId, member.userId))
      .all();

    // Суммируем персональные баллы участника
    for (const progress of userProgress) {
      totalTeamPoints += progress.pointsEarned || 0;
      
      // Собираем все выполненные задачи (уникальные по всей команде)
      if (Array.isArray(progress.completedTasks)) {
        progress.completedTasks.forEach((taskId: string) => {
          allCompletedTasks.add(taskId);
        });
      }

      // Собираем статистику по неделям (уникальные задачи по неделям)
      const week = progress.week;
      const existingStat = weeklyStatsMap.get(week);
      if (existingStat) {
        existingStat.points += progress.pointsEarned || 0;
        if (Array.isArray(progress.completedTasks)) {
          progress.completedTasks.forEach((taskId: string) => {
            existingStat.tasks.add(taskId);
          });
        }
      } else {
        const tasksSet = new Set<string>();
        if (Array.isArray(progress.completedTasks)) {
          progress.completedTasks.forEach((taskId: string) => {
            tasksSet.add(taskId);
          });
        }
        weeklyStatsMap.set(week, {
          points: progress.pointsEarned || 0,
          tasks: tasksSet,
        });
      }
    }
  }

  // Преобразуем Map в массив для weeklyStats
  const weeklyStats = Array.from(weeklyStatsMap.entries())
    .map(([week, stats]) => ({
      week,
      points: stats.points,
      tasksCompleted: stats.tasks.size,
    }))
    .sort((a, b) => a.week - b.week);

  // Обновляем или создаем запись teamProgress с пересчитанными данными
  if (existingProgress) {
    db.update(teamProgress)
      .set({
        totalPoints: totalTeamPoints,
        completedTasks: Array.from(allCompletedTasks),
        weeklyStats: weeklyStats,
        // Сохраняем другие поля без изменений
        progress: existingProgress.progress,
        unlockedKeys: existingProgress.unlockedKeys,
        completedWeeks: existingProgress.completedWeeks,
      })
      .where(eq(teamProgress.teamId, teamId))
      .run();

    // Возвращаем обновленный прогресс
    return {
      ...existingProgress,
      totalPoints: totalTeamPoints,
      completedTasks: Array.from(allCompletedTasks),
      weeklyStats: weeklyStats,
    };
  } else {
    // Создаем новую запись, если её нет
    const newProgress = {
      teamId,
      totalPoints: totalTeamPoints,
      progress: 0,
      completedTasks: Array.from(allCompletedTasks),
      unlockedKeys: [],
      completedWeeks: [],
      weeklyStats: weeklyStats,
    };

    db.insert(teamProgress)
      .values(newProgress)
      .run();

    return newProgress;
  }
}

