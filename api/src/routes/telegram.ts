import { Router } from "express";
import { z } from "zod";

import {
  registerTelegramUser,
  getTelegramUsers,
  updateUserGradeByTelegramId,
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
 * Query параметры:
 * - hasPaid: true - только оплатившие, false - только не оплатившие, не указано - все
 */
router.get("/users", (request, response) => {
  try {
    const hasPaidParam = request.query.hasPaid;
    let hasPaidFilter: boolean | undefined = undefined;
    
    if (hasPaidParam === "true") {
      hasPaidFilter = true;
    } else if (hasPaidParam === "false") {
      hasPaidFilter = false;
    }
    
    const telegramUsers = getTelegramUsers(hasPaidFilter);
    
    return response.json({
      users: telegramUsers.map((user) => ({
        telegramId: user.telegramId,
        name: user.name,
        email: user.email,
        tabNumber: user.tabNumber,
        status: user.status,
        hasPaid: user.hasPaid,
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

/**
 * Обновить грейд пользователя по telegramId
 */
const updateGradeSchema = z.object({
  telegramId: z.string().min(1, "Telegram ID обязателен"),
  grade: z.number().int().min(8).max(13, "Грейд должен быть от 8 до 13"),
});

router.put("/update-grade", (request, response) => {
  try {
    const payload = updateGradeSchema.parse(request.body);
    const updated = updateUserGradeByTelegramId(payload.telegramId, payload.grade);
    
    if (!updated) {
      return response.status(404).json({ message: "Пользователь не найден" });
    }
    
    return response.json({ success: true, message: "Грейд обновлен" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось обновить грейд",
    });
  }
});

export default router;

