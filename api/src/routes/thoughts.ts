import { Router } from "express";
import { z } from "zod";

import { createThought } from "../services/feed.js";

const router = Router();

const thoughtSchema = z.object({
  text: z.string().min(3, "Мысль слишком короткая"),
});

router.post("/anon", (request, response) => {
  try {
    const payload = thoughtSchema.parse(request.body);
    const thought = createThought(payload.text.trim());
    return response.status(201).json(thought);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось сохранить мысль",
    });
  }
});

export default router;

