import { Router } from "express";
import { z } from "zod";

import { createComment } from "../services/feed.js";
import { getRequestUser } from "../utils/get-request-user.js";

const router = Router();

const commentSchema = z.object({
  entityType: z.enum(["task", "feed", "idea"]),
  entityId: z.string().min(1, "Не указан идентификатор сущности"),
  parentId: z.string().optional(),
  body: z.string().min(1, "Комментарий пустой"),
});

router.post("/", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const payload = commentSchema.parse(request.body);

    const comment = createComment({
      entityType: payload.entityType,
      entityId: payload.entityId,
      parentId: payload.parentId,
      body: payload.body,
      userId: user.id,
    });

    return response.status(201).json(comment);
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
          : "Не удалось сохранить комментарий",
    });
  }
});

export default router;

