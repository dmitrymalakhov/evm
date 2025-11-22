import { Router } from "express";
import { z } from "zod";

import {
  registerTelegramUser,
  getTelegramUsers,
} from "../services/telegram-auth.js";

const router = Router();

const telegramRegisterSchema = z.object({
  telegramId: z.string().min(1, "Telegram ID обязателен"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().optional(),
  username: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  willDrinkAlcohol: z.boolean().optional(),
  alcoholPreference: z.string().optional(),
});

router.post("/register", (request, response) => {
  try {
    const payload = telegramRegisterSchema.parse(request.body);
    const result = registerTelegramUser(payload);
    
    return response.status(201).json({
      id: result.id,
      email: result.email,
      name: result.name,
      tabNumber: result.tabNumber,
      otpCode: result.otpCode,
      role: result.role,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось зарегистрировать пользователя",
    });
  }
});

/**
 * Получить список всех пользователей, зарегистрированных через Telegram
 * Доступно для админских задач (например, рассылка)
 */
router.get("/users", (_request, response) => {
  try {
    const telegramUsers = getTelegramUsers();
    
    return response.json({
      users: telegramUsers.map((user) => ({
        telegramId: user.telegramId,
        name: user.name,
        email: user.email,
        tabNumber: user.tabNumber,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      })),
      total: telegramUsers.length,
    });
  } catch (error) {
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось получить список пользователей",
    });
  }
});

export default router;

