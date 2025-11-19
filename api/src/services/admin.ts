import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { adminMetrics, comments, taskSubmissions, users, tasks, teamProgress, userWeekProgress, levels, iterations } from "../db/schema";
import { getTask } from "./levels";
import { getActiveIteration } from "./levels";
import { logUserAction } from "./analytics";

export function getAdminMetrics() {
  const metrics = db.select().from(adminMetrics).limit(1).get();
  
  // Если метрики не найдены, возвращаем пустые значения
  // Метрики должны рассчитываться из реальных данных пользователей и активности
  if (!metrics) {
    return {
      id: 1,
      dau: [],
      wau: [],
      funnel: [],
    };
  }
  
  return metrics;
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
  const submissions = db
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
  
  // Log submissions with photos for debugging and ensure payload is properly parsed
  const processedSubmissions = submissions.map((submission) => {
    // Ensure payload is an object (Drizzle should handle this, but let's be safe)
    let payload = submission.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
        console.log("🟡 [LIST SUBMISSIONS] Parsed payload from string:", { id: submission.id });
      } catch (e) {
        console.error("🔴 [LIST SUBMISSIONS] Failed to parse payload:", { id: submission.id, error: e });
      }
    }
    
    if (payload && typeof payload === 'object' && 'photos' in payload) {
      console.log("🔵 [LIST SUBMISSIONS] Submission with photos:", {
        id: submission.id,
        taskId: submission.taskId,
        payload: payload,
        photos: payload.photos,
        photosType: typeof payload.photos,
        isArray: Array.isArray(payload.photos),
        payloadKeys: Object.keys(payload),
      });
    }
    
    return {
      ...submission,
      payload: payload as Record<string, unknown>,
    };
  });
  
  return processedSubmissions;
}

export function getTaskSubmissionById(submissionId: string) {
  const submission = db
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
  
  if (!submission) {
    return null;
  }
  
  // Ensure payload is an object (Drizzle should handle this, but let's be safe)
  let payload = submission.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
      console.log("🟡 [GET SUBMISSION] Parsed payload from string:", { id: submissionId });
    } catch (e) {
      console.error("🔴 [GET SUBMISSION] Failed to parse payload:", { id: submissionId, error: e });
    }
  }
  
  if (payload && typeof payload === 'object' && 'photos' in payload) {
    console.log("🔵 [GET SUBMISSION] Submission with photos:", {
      id: submission.id,
      taskId: submission.taskId,
      payload: payload,
      photos: payload.photos,
      photosType: typeof payload.photos,
      isArray: Array.isArray(payload.photos),
    });
  }
  
  return {
    ...submission,
    payload: payload as Record<string, unknown>,
  };
}

export function updateTaskSubmission(
  submissionId: string,
  data: {
    status?: string;
    hint?: string | null;
    message?: string | null;
  },
) {
  const submission = db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.id, submissionId))
    .get();

  if (!submission) {
    return null;
  }

  const previousStatus = submission.status;
  const newStatus = data.status ?? previousStatus;

  // Update submission
  db.update(taskSubmissions)
    .set(data)
    .where(eq(taskSubmissions.id, submissionId))
    .run();

  // Award points if status changed to "accepted"
  // Also remove points if status changed from "accepted" to something else
  if (previousStatus !== newStatus) {
    const task = getTask(submission.taskId);
    if (!task) {
      return getTaskSubmissionById(submissionId);
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, submission.userId))
      .get();

    if (!user) {
      return getTaskSubmissionById(submissionId);
    }

    // Get level to find week
    const level = db
      .select()
      .from(levels)
      .where(eq(levels.id, task.levelId))
      .get();

    if (!level) {
      return getTaskSubmissionById(submissionId);
    }

    // Get iteration - try to find it from level or use active iteration
    let iteration = null;
    if (level.iterationId) {
      iteration = db
        .select()
        .from(iterations)
        .where(eq(iterations.id, level.iterationId))
        .get();
    }
    
    if (!iteration) {
      iteration = getActiveIteration();
    }

    if (!iteration) {
      // No iteration found, can't update progress
      return getTaskSubmissionById(submissionId);
    }

    // Update points only if status changed to/from "accepted"
    if ((previousStatus !== "accepted" && newStatus === "accepted") ||
        (previousStatus === "accepted" && newStatus !== "accepted")) {

    // Update team progress (only if user has a team)
    if (user.teamId) {
      const currentTeamProgress = db
        .select()
        .from(teamProgress)
        .where(eq(teamProgress.teamId, user.teamId))
        .get();

      if (currentTeamProgress) {
        const completedTasks = currentTeamProgress.completedTasks;
        const wasCompleted = completedTasks.includes(task.id);
        const isNowAccepted = newStatus === "accepted";
        
        if (isNowAccepted && !wasCompleted) {
          // Add task to completed and add points
          const newCompletedTasks = [...completedTasks, task.id];
          const newTotalPoints = currentTeamProgress.totalPoints + task.points;
          const newProgress = Math.min(100, currentTeamProgress.progress + 10);

          // Update weekly stats
          const weeklyStats = currentTeamProgress.weeklyStats;
          const weekStat = weeklyStats.find((stat) => stat.week === level.week);
          if (weekStat) {
            weekStat.points += task.points;
            weekStat.tasksCompleted += 1;
          } else {
            weeklyStats.push({
              week: level.week,
              points: task.points,
              tasksCompleted: 1,
            });
          }

          db.update(teamProgress)
            .set({
              totalPoints: newTotalPoints,
              progress: newProgress,
              completedTasks: newCompletedTasks,
              weeklyStats: weeklyStats,
            })
            .where(eq(teamProgress.teamId, user.teamId))
            .run();
        } else if (!isNowAccepted && wasCompleted) {
          // Remove task from completed and remove points
          const newCompletedTasks = completedTasks.filter(id => id !== task.id);
          const newTotalPoints = Math.max(0, currentTeamProgress.totalPoints - task.points);
          const newProgress = Math.max(0, currentTeamProgress.progress - 10);

          // Update weekly stats
          const weeklyStats = currentTeamProgress.weeklyStats;
          const weekStat = weeklyStats.find((stat) => stat.week === level.week);
          if (weekStat) {
            weekStat.points = Math.max(0, weekStat.points - task.points);
            weekStat.tasksCompleted = Math.max(0, weekStat.tasksCompleted - 1);
          }

          db.update(teamProgress)
            .set({
              totalPoints: newTotalPoints,
              progress: newProgress,
              completedTasks: newCompletedTasks,
              weeklyStats: weeklyStats,
            })
            .where(eq(teamProgress.teamId, user.teamId))
            .run();
        }
      } else if (isNowAccepted) {
        // Create team progress if it doesn't exist and task is accepted
        db.insert(teamProgress)
          .values({
            teamId: user.teamId,
            totalPoints: task.points,
            progress: 10,
            completedTasks: [task.id],
            unlockedKeys: [],
            completedWeeks: [],
            weeklyStats: [
              {
                week: level.week,
                points: task.points,
                tasksCompleted: 1,
              },
            ],
          })
          .run();
      }
    }

    // Update user week progress (personal points)
    const existingUserProgress = db
        .select()
        .from(userWeekProgress)
        .where(
          and(
            eq(userWeekProgress.userId, submission.userId),
            eq(userWeekProgress.iterationId, iteration.id),
            eq(userWeekProgress.week, level.week),
          ),
        )
        .get();

    const isNowAccepted = newStatus === "accepted";
    const wasAccepted = previousStatus === "accepted";

    if (existingUserProgress) {
      const completedTasks = existingUserProgress.completedTasks;
      const wasCompleted = completedTasks.includes(task.id);
      
      if (isNowAccepted && !wasCompleted) {
        // Add task and points
        db.update(userWeekProgress)
          .set({
            completedTasks: [...completedTasks, task.id],
            pointsEarned: existingUserProgress.pointsEarned + task.points,
          })
          .where(eq(userWeekProgress.id, existingUserProgress.id))
          .run();
      } else if (!isNowAccepted && wasCompleted) {
        // Remove task and points
        const newCompletedTasks = completedTasks.filter(id => id !== task.id);
        db.update(userWeekProgress)
          .set({
            completedTasks: newCompletedTasks,
            pointsEarned: Math.max(0, existingUserProgress.pointsEarned - task.points),
          })
          .where(eq(userWeekProgress.id, existingUserProgress.id))
          .run();
      }
    } else if (isNowAccepted) {
      // Create user week progress if it doesn't exist and task is accepted
      db.insert(userWeekProgress)
        .values({
          id: crypto.randomUUID(),
          userId: submission.userId,
          iterationId: iteration.id,
          week: level.week,
          completedTasks: [task.id],
          pointsEarned: task.points,
          isCompleted: false,
        })
        .run();
    }

      // Log task completion
      logUserAction({
        userId: submission.userId,
        actionType: "task_completed",
        entityType: "task",
        entityId: task.id,
        metadata: {
          submissionId: submission.id,
          points: task.points,
          teamId: user.teamId,
        },
      });
    }
  }

  // Пересчитываем персональные баллы пользователя из всех принятых задач
  // Это гарантирует, что данные всегда актуальны
  recalculateUserPoints(submission.userId);

  return getTaskSubmissionById(submissionId);
}

/**
 * Пересчитывает персональные баллы пользователя из всех принятых задач
 * Используется для исправления расхождений в данных
 */
export function recalculateUserPoints(userId: string) {
  console.log(`[Recalculate] Starting recalculation for user ${userId}`);
  // Получаем все принятые отправки пользователя
  const acceptedSubmissions = db
    .select({
      taskId: taskSubmissions.taskId,
    })
    .from(taskSubmissions)
    .where(
      and(
        eq(taskSubmissions.userId, userId),
        eq(taskSubmissions.status, "accepted")
      )
    )
    .all();

  // Группируем по неделям и итерациям
  const progressByWeek = new Map<string, {
    iterationId: string;
    week: number;
    taskIds: Set<string>;
    totalPoints: number;
  }>();

  for (const submission of acceptedSubmissions) {
    const task = getTask(submission.taskId);
    if (!task) continue;

    const level = db
      .select()
      .from(levels)
      .where(eq(levels.id, task.levelId))
      .get();

    if (!level || !level.iterationId) continue;

    const key = `${level.iterationId}-${level.week}`;
    const existing = progressByWeek.get(key);
    
    if (existing) {
      existing.taskIds.add(task.id);
      existing.totalPoints += task.points;
    } else {
      progressByWeek.set(key, {
        iterationId: level.iterationId,
        week: level.week,
        taskIds: new Set([task.id]),
        totalPoints: task.points,
      });
    }
  }

  // Обновляем или создаем записи userWeekProgress
  for (const [key, progress] of progressByWeek.entries()) {
    const existing = db
      .select()
      .from(userWeekProgress)
      .where(
        and(
          eq(userWeekProgress.userId, userId),
          eq(userWeekProgress.iterationId, progress.iterationId),
          eq(userWeekProgress.week, progress.week)
        )
      )
      .get();

    if (existing) {
      db.update(userWeekProgress)
        .set({
          completedTasks: Array.from(progress.taskIds),
          pointsEarned: progress.totalPoints,
        })
        .where(eq(userWeekProgress.id, existing.id))
        .run();
    } else {
      db.insert(userWeekProgress)
        .values({
          id: crypto.randomUUID(),
          userId: userId,
          iterationId: progress.iterationId,
          week: progress.week,
          completedTasks: Array.from(progress.taskIds),
          pointsEarned: progress.totalPoints,
          isCompleted: false,
        })
        .run();
    }
  }
  console.log(`[Recalculate] Completed recalculation for user ${userId}`);
}

/**
 * Пересчитывает персональные баллы для всех пользователей, у которых есть принятые задачи
 */
export function recalculateAllUsersPoints() {
  console.log("[Recalculate] Starting recalculation for all users");
  
  // Получаем всех пользователей, у которых есть принятые отправки
  const allAcceptedSubmissions = db
    .select({
      userId: taskSubmissions.userId,
    })
    .from(taskSubmissions)
    .where(eq(taskSubmissions.status, "accepted"))
    .all();

  // Получаем уникальные ID пользователей
  const uniqueUserIds = [...new Set(allAcceptedSubmissions.map(u => u.userId))];
  
  console.log(`[Recalculate] Found ${uniqueUserIds.length} users with accepted submissions`);

  for (const userId of uniqueUserIds) {
    try {
      recalculateUserPoints(userId);
    } catch (error) {
      console.error(`[Recalculate] Error recalculating points for user ${userId}:`, error);
    }
  }

  console.log("[Recalculate] Completed recalculation for all users");
  return uniqueUserIds.length;
}

