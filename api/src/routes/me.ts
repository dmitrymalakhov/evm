import { Router } from "express";

import { getRequestUser } from "../utils/get-request-user.js";

const router = Router();

router.get("/", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(404).json({ message: "Пользователь не найден" });
    }
    return response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? undefined,
      title: user.title ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
    });
  } catch (error) {
    return response.status(401).json({
      message:
        error instanceof Error ? error.message : "Не удалось получить профиль",
    });
  }
});

export default router;

