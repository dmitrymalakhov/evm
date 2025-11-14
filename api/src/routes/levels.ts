import { Router } from "express";

import {
  getCurrentLevel,
  getActiveIteration,
  getIterationById,
  getLevelById,
  getLevelByWeek,
  getTasksForLevel,
} from "../services/levels";

const router = Router();

router.get("/current", (_request, response) => {
  const level = getCurrentLevel();
  const iteration = getActiveIteration();

  if (!level || !iteration) {
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
    iteration: {
      id: iteration.id,
      name: iteration.name,
      currentWeek: iteration.currentWeek,
      totalWeeks: iteration.totalWeeks,
      startsAt: iteration.startsAt.toISOString(),
      endsAt: iteration.endsAt.toISOString(),
    },
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

  const iterationId =
    typeof request.query.iterationId === "string"
      ? request.query.iterationId
      : undefined;
  const level = getLevelByWeek(weekNumber, iterationId);
  if (!level) {
    return response.status(404).json({ message: "Уровень не найден" });
  }

  // Всегда используем getActiveIteration() для получения актуальной информации об активной неделе
  // Это гарантирует, что currentWeek будет актуальным, даже если администратор изменил его
  const activeIteration = getActiveIteration();
  const iteration =
    level.iterationId !== null && level.iterationId !== undefined
      ? getIterationById(level.iterationId)
      : activeIteration;
  
  // Если уровень принадлежит активной итерации, используем актуальную информацию об активной неделе
  const finalIteration = iteration && activeIteration && iteration.id === activeIteration.id
    ? activeIteration
    : iteration;

  return response.json({
    id: level.id,
    week: level.week,
    title: level.title,
    state: level.state,
    opensAt: level.opensAt,
    closesAt: level.closesAt,
    iteration: finalIteration
      ? {
          id: finalIteration.id,
          name: finalIteration.name,
          currentWeek: finalIteration.currentWeek,
          totalWeeks: finalIteration.totalWeeks,
          startsAt: finalIteration.startsAt.toISOString(),
          endsAt: finalIteration.endsAt.toISOString(),
        }
      : undefined,
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

