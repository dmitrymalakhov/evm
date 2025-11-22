import { Router, type Response } from "express";
import { z } from "zod";

import {
  SecretSantaError,
  drawSecretSantaRecipient,
  drawAllSecretSantaRecipients,
  getSecretSantaState,
  getSecretSantaAdminState,
  markSecretSantaGifted,
  registerSecretSantaParticipant,
  updateSecretSantaReminder,
} from "../services/secret-santa.js";
import { getRequestUser } from "../utils/get-request-user.js";

const router = Router();

const registrationSchema = z.object({
  wishlist: z.string().min(1, "Добавьте пожелания"),
  reminderNote: z.string().max(400).optional(),
});

const reminderSchema = z.object({
  reminderNote: z.string().max(400).optional(),
});

function handleRouteError(error: unknown, response: Response) {
  if (error instanceof z.ZodError) {
    return response.status(422).json({ message: error.issues[0]?.message ?? "Неверные данные" });
  }

  if (error instanceof SecretSantaError) {
    switch (error.code) {
      case "already_matched":
        return response.status(409).json({ message: "Получатель уже выбран" });
      case "no_candidates":
        return response.status(409).json({ message: "Нет доступных участников для жеребьевки" });
      case "no_match":
        return response.status(422).json({ message: "Сначала вытяните получателя" });
      case "not_registered":
      default:
        return response.status(400).json({ message: "Сначала подтвердите участие" });
    }
  }

  if (error instanceof Error && error.name === "UnauthorizedError") {
    return response.status(401).json({ message: error.message });
  }

  return response.status(500).json({
    message: error instanceof Error ? error.message : "Неизвестная ошибка",
  });
}

router.get("/", (request, response) => {
  const user = getRequestUser(request);
  return response.json(getSecretSantaState(user?.id));
});

router.post("/register", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const payload = registrationSchema.parse(request.body);
    const state = registerSecretSantaParticipant({
      userId: user.id,
      wishlist: payload.wishlist.trim(),
      reminderNote: payload.reminderNote,
    });
    return response.status(201).json(state);
  } catch (error) {
    return handleRouteError(error, response);
  }
});

router.post("/draw", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const state = drawSecretSantaRecipient(user.id);
    return response.json(state);
  } catch (error) {
    return handleRouteError(error, response);
  }
});

router.post("/gift", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const state = markSecretSantaGifted(user.id);
    return response.json(state);
  } catch (error) {
    return handleRouteError(error, response);
  }
});

router.post("/reminder", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const payload = reminderSchema.parse(request.body);
    const state = updateSecretSantaReminder(user.id, payload.reminderNote ?? "");
    return response.json(state);
  } catch (error) {
    return handleRouteError(error, response);
  }
});

router.get("/admin", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (user.role !== "admin") {
      return response.status(403).json({ message: "Только администратор может просматривать полную информацию" });
    }

    const state = getSecretSantaAdminState();
    return response.json(state);
  } catch (error) {
    return handleRouteError(error, response);
  }
});

router.post("/admin/draw-all", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (user.role !== "admin") {
      return response.status(403).json({ message: "Только администратор может запустить массовую жеребьевку" });
    }

    const state = drawAllSecretSantaRecipients();
    return response.json(state);
  } catch (error) {
    return handleRouteError(error, response);
  }
});

export default router;

