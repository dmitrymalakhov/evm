import { Router } from "express";
import { z } from "zod";

import {
  getAdminMetrics,
  hideComment,
  listComments,
  listTaskSubmissions,
  getTaskSubmissionById,
  updateTaskSubmission,
  recalculateUserPoints,
  recalculateAllUsersPoints,
} from "../services/admin";
import {
  addTask,
  deleteTask,
  getIterationById,
  getLevelById,
  getTask,
  getTasksForLevel,
  listIterations,
  listLevels,
  setIterationCurrentWeek,
  updateLevel,
  updateTask,
  upsertLevel,
} from "../services/levels";
import { getRequestUser } from "../utils/get-request-user";

const router = Router();

const levelSchema = z.object({
  id: z.string().optional(),
  iterationId: z.string().optional(),
  week: z.number().int(),
  title: z.string().min(1, "Укажите название уровня"),
  state: z.enum(["scheduled", "open", "closed"]),
  opensAt: z.string().min(1, "Укажите дату открытия"),
  closesAt: z.string().min(1, "Укажите дату закрытия"),
  config: z.object({
    storyline: z.string().min(1, "Добавьте сюжет уровня"),
    hint: z.string().optional(),
  }),
});

const levelUpdateSchema = levelSchema.partial().extend({
  config: levelSchema.shape.config.partial(),
});

const taskSchema = z.object({
  type: z.enum(["quiz", "cipher", "upload", "vote", "qr", "final"]),
  title: z.string().min(1, "Укажите название задачи"),
  description: z.string().min(1, "Добавьте описание задачи"),
  points: z
    .number()
    .int({ message: "Количество баллов должно быть целым числом" })
    .min(0, "Баллы не могут быть отрицательными"),
  config: z.record(z.unknown()).default({}),
});

const taskUpdateSchema = taskSchema.extend({
  levelId: z.string().optional(),
}).partial();

const iterationWeekSchema = z.object({
  currentWeek: z
    .number()
    .int({ message: "Номер недели должен быть целым числом" })
    .min(1, "Номер недели должен быть положительным"),
});

router.get("/iterations", (_request, response) => {
  const iterations = listIterations();
  return response.json(
    iterations.map((iteration) => ({
      id: iteration.id,
      name: iteration.name,
      startsAt: iteration.startsAt.toISOString(),
      endsAt: iteration.endsAt.toISOString(),
      totalWeeks: iteration.totalWeeks,
      currentWeek: iteration.currentWeek,
    })),
  );
});

router.post("/iterations/:iterationId/current-week", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const existingIteration = getIterationById(request.params.iterationId);
    if (!existingIteration) {
      return response.status(404).json({ message: "Итерация не найдена" });
    }

    const payload = iterationWeekSchema.parse(request.body);
    if (payload.currentWeek > existingIteration.totalWeeks) {
      return response.status(422).json({
        message: `Нельзя установить неделю ${payload.currentWeek}, всего недель: ${existingIteration.totalWeeks}`,
      });
    }
    const updated = setIterationCurrentWeek(
      existingIteration.id,
      payload.currentWeek,
    );

    return response.json({
      id: updated?.id ?? existingIteration.id,
      name: updated?.name ?? existingIteration.name,
      startsAt: (updated?.startsAt ?? existingIteration.startsAt).toISOString(),
      endsAt: (updated?.endsAt ?? existingIteration.endsAt).toISOString(),
      totalWeeks: updated?.totalWeeks ?? existingIteration.totalWeeks,
      currentWeek: updated?.currentWeek ?? payload.currentWeek,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось обновить текущую неделю итерации",
    });
  }
});

router.get("/levels", (_request, response) => {
  const levels = listLevels();
  return response.json(
    levels.map((level) => ({
      id: level.id,
      iterationId: level.iterationId ?? undefined,
      week: level.week,
      title: level.title,
      state: level.state,
      opensAt: level.opensAt,
      closesAt: level.closesAt,
      config: {
        storyline: level.storyline,
        hint: level.hint ?? undefined,
      },
    })),
  );
});

router.post("/levels", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }
    const payload = levelSchema.parse(request.body);
    const levelId = payload.id ?? crypto.randomUUID();
    const level = upsertLevel({
      id: levelId,
      iterationId: payload.iterationId,
      week: payload.week,
      title: payload.title,
      state: payload.state,
      opensAt: payload.opensAt,
      closesAt: payload.closesAt,
      storyline: payload.config.storyline,
      hint: payload.config.hint,
    });
    return response.status(201).json({
      id: level?.id ?? levelId,
      iterationId: level?.iterationId ?? payload.iterationId,
      week: level?.week ?? payload.week,
      title: level?.title ?? payload.title,
      state: level?.state ?? payload.state,
      opensAt: level?.opensAt ?? payload.opensAt,
      closesAt: level?.closesAt ?? payload.closesAt,
      config: {
        storyline: level?.storyline ?? payload.config.storyline,
        hint: level?.hint ?? payload.config.hint,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось создать уровень",
    });
  }
});

router.put("/levels/:levelId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }
    const existing = getLevelById(request.params.levelId);
    if (!existing) {
      return response.status(404).json({ message: "Уровень не найден" });
    }

    const payload = levelUpdateSchema.parse(request.body);
    const updated = updateLevel(existing.id, {
      iterationId: payload.iterationId ?? existing.iterationId,
      week: payload.week ?? existing.week,
      title: payload.title ?? existing.title,
      state: (payload.state ?? existing.state) as typeof existing.state,
      opensAt: payload.opensAt ?? existing.opensAt,
      closesAt: payload.closesAt ?? existing.closesAt,
      storyline: payload.config?.storyline ?? existing.storyline,
      hint: payload.config?.hint ?? existing.hint,
    });

    return response.json({
      id: updated?.id ?? existing.id,
      iterationId: updated?.iterationId ?? existing.iterationId ?? undefined,
      week: updated?.week ?? existing.week,
      title: updated?.title ?? existing.title,
      state: updated?.state ?? existing.state,
      opensAt: updated?.opensAt ?? existing.opensAt,
      closesAt: updated?.closesAt ?? existing.closesAt,
      config: {
        storyline: updated?.storyline ?? existing.storyline,
        hint: updated?.hint ?? existing.hint ?? undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось обновить уровень",
    });
  }
});

router.get("/levels/:levelId/tasks", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить задачи уровня",
    });
  }

  const level = getLevelById(request.params.levelId);
  if (!level) {
    return response.status(404).json({ message: "Уровень не найден" });
  }

  const tasks = getTasksForLevel(level.id);
  return response.json(
    tasks.map((task) => ({
      id: task.id,
      levelId: task.levelId,
      type: task.type,
      title: task.title,
      description: task.description,
      points: task.points,
      config: task.config,
    })),
  );
});

router.post("/levels/:levelId/tasks", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const level = getLevelById(request.params.levelId);
    if (!level) {
      return response.status(404).json({ message: "Уровень не найден" });
    }

    const payload = taskSchema.parse(request.body);
    const taskId = crypto.randomUUID();
    const task = addTask({
      id: taskId,
      levelId: level.id,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      points: payload.points,
      config: payload.config,
    });

    return response.status(201).json({
      id: task?.id ?? taskId,
      levelId: task?.levelId ?? level.id,
      type: task?.type ?? payload.type,
      title: task?.title ?? payload.title,
      description: task?.description ?? payload.description,
      points: task?.points ?? payload.points,
      config: task?.config ?? payload.config,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось создать задачу",
    });
  }
});

router.put("/tasks/:taskId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const existing = getTask(request.params.taskId);
    if (!existing) {
      return response.status(404).json({ message: "Задача не найдена" });
    }

    const payload = taskUpdateSchema.parse(request.body);
    const updated = updateTask(existing.id, {
      levelId: payload.levelId ?? existing.levelId,
      type: payload.type ?? existing.type,
      title: payload.title ?? existing.title,
      description: payload.description ?? existing.description,
      points: payload.points ?? existing.points,
      config: payload.config ?? existing.config,
    });

    return response.json({
      id: updated?.id ?? existing.id,
      levelId: updated?.levelId ?? existing.levelId,
      type: updated?.type ?? existing.type,
      title: updated?.title ?? existing.title,
      description: updated?.description ?? existing.description,
      points: updated?.points ?? existing.points,
      config: updated?.config ?? existing.config,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось обновить задачу",
    });
  }
});

router.delete("/tasks/:taskId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const task = deleteTask(request.params.taskId);
    if (!task) {
      return response.status(404).json({ message: "Задача не найдена" });
    }

    return response.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось удалить задачу",
    });
  }
});

router.get("/moderation/comments", (_request, response) => {
  return response.json(listComments());
});

router.post("/moderation/comments/:commentId/hide", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || (user.role !== "admin" && user.role !== "mod")) {
      return response.status(403).json({ message: "Недостаточно прав" });
    }
    const comment = hideComment(request.params.commentId);
    if (!comment) {
      return response.status(404).json({ message: "Комментарий не найден" });
    }
    return response.json(comment);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось скрыть комментарий",
    });
  }
});

router.get("/metrics", (_request, response) => {
  const metrics = getAdminMetrics();
  if (!metrics) {
    return response.status(404).json({ message: "Метрики не найдены" });
  }
  return response.json(metrics);
});

router.get("/moderation/submissions", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || (user.role !== "admin" && user.role !== "mod")) {
      return response.status(403).json({ message: "Недостаточно прав" });
    }
    const submissions = listTaskSubmissions();
    return response.json(submissions);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить отправки заданий",
    });
  }
});

router.get("/moderation/submissions/:submissionId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || (user.role !== "admin" && user.role !== "mod")) {
      return response.status(403).json({ message: "Недостаточно прав" });
    }
    const submission = getTaskSubmissionById(request.params.submissionId);
    if (!submission) {
      return response.status(404).json({ message: "Отправка не найдена" });
    }
    return response.json(submission);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить отправку задания",
    });
  }
});

router.put("/moderation/submissions/:submissionId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || (user.role !== "admin" && user.role !== "mod")) {
      return response.status(403).json({ message: "Недостаточно прав" });
    }
    const submission = getTaskSubmissionById(request.params.submissionId);
    if (!submission) {
      return response.status(404).json({ message: "Отправка не найдена" });
    }

    const payload = z
      .object({
        status: z.enum(["accepted", "rejected", "pending", "revision"]).optional(),
        hint: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
      })
      .parse(request.body);

    const updated = updateTaskSubmission(request.params.submissionId, payload);
    return response.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось обновить отправку задания",
    });
  }
});

// Эндпоинт для пересчета персональных баллов пользователя
router.post("/recalculate-user-points/:userId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (user.role !== "admin") {
      return response.status(403).json({ message: "Только администратор может пересчитывать баллы" });
    }

    const userId = request.params.userId;
    recalculateUserPoints(userId);

    return response.json({ message: "Баллы пользователя пересчитаны" });
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось пересчитать баллы",
    });
  }
});

// Эндпоинт для пересчета персональных баллов всех пользователей
router.post("/recalculate-all-users-points", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (user.role !== "admin") {
      return response.status(403).json({ message: "Только администратор может пересчитывать баллы" });
    }

    const usersCount = recalculateAllUsersPoints();

    return response.json({ 
      message: `Баллы пересчитаны для ${usersCount} пользователей`,
      usersCount 
    });
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось пересчитать баллы",
    });
  }
});

export default router;

