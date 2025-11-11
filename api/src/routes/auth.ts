import { Router } from "express";
import { z } from "zod";

import { loginWithOtp } from "../services/auth";

const router = Router();

const loginSchema = z.object({
  tabNumber: z.string().min(1, "Введите табельный номер"),
  otp: z.string().min(1, "Введите одноразовый код"),
});

router.post("/login", (request, response) => {
  try {
    const payload = loginSchema.parse(request.body);
    const result = loginWithOtp(payload);
    return response.json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    return response.status(401).json({
      message:
        error instanceof Error ? error.message : "Не удалось выполнить вход.",
    });
  }
});

export default router;

