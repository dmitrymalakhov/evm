import { Router } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { tickets } from "../db/schema";
import { getRequestUser } from "../utils/get-request-user";

const router = Router();

router.get("/me", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(404).json({ message: "Пользователь не найден" });
    }

    const ticket = db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, user.id))
      .get();

    if (!ticket) {
      return response.status(404).json({ message: "Билет не найден" });
    }

    return response.json(ticket);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось получить билет пользователя",
    });
  }
});

export default router;

