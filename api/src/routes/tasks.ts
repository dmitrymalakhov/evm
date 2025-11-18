import { Router } from "express";
import { z } from "zod";

import { getRequestUser } from "../utils/get-request-user";
import { getTask } from "../services/levels";
import { saveTaskSubmission, getUserTaskSubmissions } from "../services/feed";

const router = Router();

const submissionSchema = z.record(z.string(), z.unknown()).default({});

router.get("/submissions", (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const taskIds = typeof request.query.taskIds === "string"
      ? request.query.taskIds.split(",")
      : undefined;

    const submissions = getUserTaskSubmissions(user.id, taskIds);
    return response.json(
      submissions.map((sub) => ({
        taskId: sub.taskId,
        status: sub.status,
        hint: sub.hint,
        message: sub.message,
        createdAt: sub.createdAt,
      })),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить отправки",
    });
  }
});

router.post("/:taskId/submit", (request, response) => {
  const task = getTask(request.params.taskId);
  if (!task) {
    return response
      .status(404)
      .json({ status: "rejected", message: "Задача не найдена" });
  }

  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ status: "rejected", message: "Пользователь не авторизован" });
    }

    const payload = submissionSchema.parse(request.body ?? {});

    const submission = saveTaskSubmission({
      taskId: task.id,
      userId: user.id,
      body: payload,
    });

    return response.json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response
        .status(422)
        .json({ status: "rejected", message: error.issues[0].message });
    }

    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response
        .status(401)
        .json({ status: "rejected", message: error.message });
    }

    return response.status(500).json({
      status: "rejected",
      message:
        error instanceof Error
          ? error.message
          : "Не удалось принять задание.",
    });
  }
});

export default router;

