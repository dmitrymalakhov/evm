import { Router } from "express";
import { z } from "zod";

import {
  addTeamChatMessage,
  createIdea,
  getTeam,
  getTeamChat,
  getTeamProgress,
  listIdeas,
  updateIdea,
} from "../services/team";
import { getRequestUser } from "../utils/get-request-user";

const router = Router();

const chatSchema = z.object({
  body: z.string().min(1, "Пустое сообщение"),
});

const ideaSchema = z.object({
  title: z.string().min(1, "Укажите название идеи"),
  description: z.string().min(1, "Добавьте описание идеи"),
});

const ideaUpdateSchema = ideaSchema.partial().extend({
  votes: z.number().int().nonnegative().optional(),
});

router.get("/:teamId", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }
  return response.json(team);
});

router.get("/:teamId/chat", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }
  return response.json(getTeamChat(team.id));
});

router.post("/:teamId/chat", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  try {
    const user = getRequestUser(request, true);
    const payload = chatSchema.parse(request.body);
    const message = addTeamChatMessage(team.id, {
      userId: user!.id,
      userName: user!.name,
      body: payload.body.trim(),
    });
    return response.status(201).json(message);
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
          : "Не удалось отправить сообщение",
    });
  }
});

router.get("/:teamId/ideas", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }
  return response.json(listIdeas(team.id));
});

router.post("/:teamId/ideas", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }
    const payload = ideaSchema.parse(request.body);
    const idea = createIdea({
      teamId: team.id,
      title: payload.title.trim(),
      description: payload.description.trim(),
    });
    return response.status(201).json(idea);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось создать идею",
    });
  }
});

router.put("/:teamId/ideas/:ideaId", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }
    const payload = ideaUpdateSchema.parse(request.body);
    const updated = updateIdea(team.id, request.params.ideaId, {
      title: payload.title?.trim(),
      description: payload.description?.trim(),
      votes: payload.votes,
    });
    if (!updated) {
      return response.status(404).json({ message: "Идея не найдена" });
    }
    return response.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(422).json({ message: error.issues[0].message });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось обновить идею",
    });
  }
});

router.get("/:teamId/progress", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  const progress = getTeamProgress(team.id);
  if (!progress) {
    return response.status(404).json({ message: "Прогресс команды не найден" });
  }

  return response.json({
    progress: progress.progress,
    completedTasks: progress.completedTasks,
    unlockedKeys: progress.unlockedKeys,
  });
});

export default router;

