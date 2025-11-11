import { Router } from "express";
import { z } from "zod";

import {
  getAdminMetrics,
  hideComment,
  listComments,
} from "../services/admin";
import {
  getLevelById,
  listLevels,
  updateLevel,
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

export default router;

