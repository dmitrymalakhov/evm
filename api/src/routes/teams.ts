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
  voteForIdea,
  removeIdeaVote,
  IdeaVoteError,
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
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const payload = chatSchema.parse(request.body);
    const message = addTeamChatMessage(team.id, {
      userId: user.id,
      userName: user.name,
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
  const user = getRequestUser(request);
  return response.json(listIdeas(team.id, user?.id));
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
    return response.status(201).json({ ...idea, userHasVoted: false });
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
    const ideaWithFlag =
      listIdeas(team.id, user.id).find((idea) => idea.id === updated.id) ??
      { ...updated, userHasVoted: false };
    return response.json(ideaWithFlag);
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

router.post("/:teamId/ideas/:ideaId/vote", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const updated = voteForIdea(team.id, request.params.ideaId, user.id);
    if (!updated) {
      return response.status(404).json({ message: "Идея не найдена" });
    }

    return response.status(200).json({ ...updated, userHasVoted: true });
  } catch (error) {
    if (error instanceof IdeaVoteError && error.message === "already_voted") {
      return response.status(409).json({
        message: "Вы уже голосовали за эту идею",
      });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось сохранить голос",
    });
  }
});

router.delete("/:teamId/ideas/:ideaId/vote", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const updated = removeIdeaVote(team.id, request.params.ideaId, user.id);
    if (!updated) {
      return response.status(404).json({ message: "Идея не найдена" });
    }

    return response.status(200).json({ ...updated, userHasVoted: false });
  } catch (error) {
    if (error instanceof IdeaVoteError && error.message === "not_voted") {
      return response.status(409).json({
        message: "У вас нет голосов за эту идею",
      });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }
    return response.status(500).json({
      message:
        error instanceof Error ? error.message : "Не удалось отменить голос",
    });
  }
});

router.get("/:teamId/progress", (request, response) => {
  const team = getTeam(request.params.teamId);
  if (!team) {
    return response.status(404).json({ message: "Команда не найдена" });
  }

  const progress = getTeamProgress(team.id);
  // Если прогресс не найден, возвращаем пустой прогресс (для новой команды)
  if (!progress) {
    return response.json({
      progress: 0,
      totalPoints: 0,
      completedTasks: [],
      unlockedKeys: [],
      completedWeeks: [],
      weeklyStats: [],
    });
  }

  return response.json({
    progress: progress.progress,
    totalPoints: progress.totalPoints,
    completedTasks: progress.completedTasks,
    unlockedKeys: progress.unlockedKeys,
    completedWeeks: progress.completedWeeks,
    weeklyStats: progress.weeklyStats,
  });
});

export default router;

