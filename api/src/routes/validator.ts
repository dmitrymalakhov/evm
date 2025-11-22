import { Router } from "express";
import { z } from "zod";

import { validateCode } from "../services/validator.js";

const router = Router();

const validatorSchema = z.object({
  code: z.string().min(1, "Введите код"),
});

router.post("/check", (request, response) => {
  try {
    const payload = validatorSchema.parse(request.body);
    return response.json(validateCode(payload.code));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({
        status: "invalid",
        message: error.issues[0].message,
      });
    }
    return response.status(500).json({
      status: "invalid",
      message:
        error instanceof Error ? error.message : "Не удалось проверить код",
    });
  }
});

export default router;

