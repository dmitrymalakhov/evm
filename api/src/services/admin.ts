import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { adminMetrics, comments, taskSubmissions, users, tasks, teamProgress, userWeekProgress, levels, iterations } from "../db/schema";
import { getTask } from "./levels";
import { getActiveIteration } from "./levels";
import { logUserAction } from "./analytics";

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
  if (previousStatus !== "accepted" && newStatus === "accepted") {
    const task = getTask(submission.taskId);
    if (!task) {
      return getTaskSubmissionById(submissionId);
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, submission.userId))
      .get();

    if (!user || !user.teamId) {
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

    // Check if level belongs to active iteration
    const iteration = getActiveIteration();
    if (!iteration || level.iterationId !== iteration.id) {
      // Level doesn't belong to active iteration, don't update progress
      return getTaskSubmissionById(submissionId);
    }

    // Update team progress
    const currentTeamProgress = db
      .select()
      .from(teamProgress)
      .where(eq(teamProgress.teamId, user.teamId))
      .get();

    if (currentTeamProgress) {
      const completedTasks = currentTeamProgress.completedTasks;
      if (!completedTasks.includes(task.id)) {
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
      }
    } else {
      // Create team progress if it doesn't exist
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

    // Update user week progress (iteration already checked above)
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

    if (existingUserProgress) {
      const completedTasks = existingUserProgress.completedTasks;
      if (!completedTasks.includes(task.id)) {
        db.update(userWeekProgress)
          .set({
            completedTasks: [...completedTasks, task.id],
            pointsEarned: existingUserProgress.pointsEarned + task.points,
          })
          .where(eq(userWeekProgress.id, existingUserProgress.id))
          .run();
      }
    } else {
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

  return getTaskSubmissionById(submissionId);
}

