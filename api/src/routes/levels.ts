import { Router } from "express";

import {
  getCurrentLevel,
  getLevelById,
  getLevelByWeek,
  getTasksForLevel,
} from "../services/levels";

const router = Router();

router.get("/current", (_request, response) => {
  const level = getCurrentLevel();
  if (!level) {
    return response
      .status(404)
      .json({ message: "Активный уровень не найден" });
  }

  return response.json({
    id: level.id,
    week: level.week,
    title: level.title,
    state: level.state,
    opensAt: level.opensAt,
    closesAt: level.closesAt,
    config: {
      storyline: level.storyline,
      hint: level.hint ?? undefined,
    },
  });
});

router.get("/week/:week", (request, response) => {
  const weekNumber = Number(request.params.week);
  if (Number.isNaN(weekNumber)) {
    return response
      .status(400)
      .json({ message: "Некорректный номер недели" });
  }

  const level = getLevelByWeek(weekNumber);
  if (!level) {
    return response.status(404).json({ message: "Уровень не найден" });
  }

  return response.json({
    id: level.id,
    week: level.week,
    title: level.title,
    state: level.state,
    opensAt: level.opensAt,
    closesAt: level.closesAt,
    config: {
      storyline: level.storyline,
      hint: level.hint ?? undefined,
    },
  });
});

router.get("/:levelId/tasks", (request, response) => {
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

export default router;

