import { Router } from "express";

import {
  getTaskCompletionStats,
  getUserProgressStats,
  getWeeklyActivityStats,
  getTopUsersByActivity,
  getTaskCompletionByWeek,
  getUserActivityTimeline,
} from "../services/analytics";
import { getRequestUser } from "../utils/get-request-user";

const router = Router();

router.get("/task-completion", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const taskId = request.query.taskId as string | undefined;
    const stats = getTaskCompletionStats(taskId);
    return response.json(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить статистику выполнения заданий",
    });
  }
});

router.get("/user-progress", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const userId = request.query.userId as string | undefined;
    const stats = getUserProgressStats(userId);
    return response.json(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить статистику прогресса пользователей",
    });
  }
});

router.get("/weekly-activity", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const startDate = request.query.startDate
      ? new Date(request.query.startDate as string)
      : undefined;
    const endDate = request.query.endDate
      ? new Date(request.query.endDate as string)
      : undefined;

    const stats = getWeeklyActivityStats(startDate, endDate);
    return response.json(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить статистику активности по неделям",
    });
  }
});

router.get("/top-users", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const limit = request.query.limit
      ? parseInt(request.query.limit as string, 10)
      : 10;

    const stats = getTopUsersByActivity(limit);
    return response.json(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить топ пользователей",
    });
  }
});

router.get("/task-completion-by-week", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const stats = getTaskCompletionByWeek();
    return response.json(stats);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить статистику выполнения заданий по неделям",
    });
  }
});

router.get("/user-timeline/:userId", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user || user.role !== "admin") {
      return response
        .status(403)
        .json({ message: "Требуются права администратора" });
    }

    const days = request.query.days
      ? parseInt(request.query.days as string, 10)
      : 30;

    const timeline = getUserActivityTimeline(request.params.userId, days);
    return response.json(timeline);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить временную линию активности пользователя",
    });
  }
});

export default router;

