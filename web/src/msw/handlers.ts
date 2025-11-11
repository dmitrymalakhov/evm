import { http, HttpResponse, delay } from "msw";

import {
  mockAdminMetrics,
  mockChatMessages,
  mockComments,
  mockIdeas,
  mockLevel,
  mockTasks,
  mockTeam,
  mockThoughtFeed,
  mockTicket,
  mockUser,
} from "@/msw/fixtures";
import type {
  Idea,
  Level,
  SubmissionResponse,
  Thought,
  Ticket,
} from "@/types/contracts";

const featureFlags = {
  realtime: true,
  payments: false,
  admin: true,
};

let ideasStore = [...mockIdeas];
let chatStore = [...mockChatMessages];
let thoughtsStore = [...mockThoughtFeed.thoughts];
let commentsStore = [...mockComments];
let levelsStore: Level[] = [mockLevel];
let ticketStore: Ticket = { ...mockTicket };
let submittedKeys = new Set<string>();

export const handlers = [
  http.post("/auth/login", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload || !("tabNumber" in payload) || !("otp" in payload)) {
      return HttpResponse.json(
        { message: "Неверный формат запроса" },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3_600,
    });
  }),

  http.get("/features", () => {
    return HttpResponse.json(featureFlags);
  }),

  http.get("/me", async () => {
    await delay(250);
    return HttpResponse.json(mockUser);
  }),

  http.get("/levels/current", async () => {
    await delay(250);
    return HttpResponse.json(mockLevel);
  }),

  http.get("/levels/week/:week", async ({ params }) => {
    await delay(200);
    const week = Number(params.week);
    const level = levelsStore.find((lvl) => lvl.week === week);
    if (!level) {
      return HttpResponse.json(
        { message: "Уровень не найден" },
        { status: 404 },
      );
    }
    return HttpResponse.json(level);
  }),

  http.get("/levels/:id/tasks", async ({ params }) => {
    await delay(280);
    const { id } = params;
    const tasks = mockTasks.filter((task) => task.levelId === id);
    return HttpResponse.json(tasks);
  }),

  http.post("/tasks/:id/submit", async ({ params, request }) => {
    await delay(500);
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    if (!id) {
      return HttpResponse.json(
        { status: "rejected", message: "Задача не найдена" },
        { status: 404 },
      );
    }
    const submission: SubmissionResponse = {
      status: "accepted",
      hint: submittedKeys.has(id as string)
        ? "Ключ уже извлечён, проверьте хранилище."
        : "Фрагмент ключа сохранён.",
    };
    submittedKeys.add(id as string);
    return HttpResponse.json(submission);
  }),

  http.get("/feed", async () => {
    await delay(320);
    return HttpResponse.json({
      comments: commentsStore,
      thoughts: thoughtsStore,
    });
  }),

  http.post("/thoughts/anon", async ({ request }) => {
    await delay(450);
    const { text } = (await request.json()) as { text?: string };
    if (!text || text.length < 3) {
      return HttpResponse.json(
        { message: "Мысль слишком короткая" },
        { status: 422 },
      );
    }
    const thought: Thought = {
      id: `th${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
    };
    thoughtsStore = [thought, ...thoughtsStore].slice(0, 12);
    return HttpResponse.json(thought, { status: 201 });
  }),

  http.post("/comments", async ({ request }) => {
    await delay(380);
    const payload = (await request.json()) as {
      entityType: "task" | "feed" | "idea";
      entityId: string;
      parentId?: string;
      body: string;
    };
    if (!payload.body) {
      return HttpResponse.json(
        { message: "Комментарий пустой" },
        { status: 422 },
      );
    }
    const newComment = {
      id: `c${Date.now()}`,
      userId: mockUser.id,
      createdAt: new Date().toISOString(),
      status: "ok" as const,
      ...payload,
    };
    commentsStore = [newComment, ...commentsStore];
    return HttpResponse.json(newComment, { status: 201 });
  }),

  http.get("/tickets/me", async () => {
    await delay(200);
    return HttpResponse.json(ticketStore);
  }),

  http.get("/teams/:id", async ({ params }) => {
    await delay(220);
    if (params.id !== mockTeam.id) {
      return HttpResponse.json({ message: "Команда не найдена" }, { status: 404 });
    }
    return HttpResponse.json(mockTeam);
  }),

  http.get("/teams/:id/chat", async ({ params }) => {
    await delay(180);
    if (params.id !== mockTeam.id) {
      return HttpResponse.json(
        { message: "Чат не найден" },
        { status: 404 },
      );
    }
    return HttpResponse.json(chatStore);
  }),

  http.post("/teams/:id/chat", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    if (id !== mockTeam.id) {
      return HttpResponse.json(
        { message: "Команда не найдена" },
        { status: 404 },
      );
    }
    const { body } = (await request.json()) as { body?: string };
    if (!body) {
      return HttpResponse.json(
        { message: "Пустое сообщение" },
        { status: 422 },
      );
    }
    const message = {
      id: `msg-${Date.now()}`,
      teamId: mockTeam.id,
      userId: mockUser.id,
      userName: mockUser.name,
      body,
      createdAt: new Date().toISOString(),
    };
    chatStore = [...chatStore, message].slice(-50);
    return HttpResponse.json(message, { status: 201 });
  }),

  http.get("/teams/:id/ideas", async ({ params }) => {
    await delay(150);
    if (params.id !== mockTeam.id) {
      return HttpResponse.json(
        { message: "Команда не найдена" },
        { status: 404 },
      );
    }
    return HttpResponse.json(ideasStore);
  }),

  http.post("/teams/:id/ideas", async ({ params, request }) => {
    await delay(350);
    if (params.id !== mockTeam.id) {
      return HttpResponse.json(
        { message: "Команда не найдена" },
        { status: 404 },
      );
    }
    const payload = (await request.json()) as Partial<Idea>;
    if (!payload.title || !payload.description) {
      return HttpResponse.json(
        { message: "Заполните поля идеи" },
        { status: 422 },
      );
    }
    const idea: Idea = {
      id: `idea-${Date.now()}`,
      teamId: mockTeam.id,
      title: payload.title,
      description: payload.description,
      votes: 0,
      createdAt: new Date().toISOString(),
    };
    ideasStore = [idea, ...ideasStore];
    return HttpResponse.json(idea, { status: 201 });
  }),

  http.put("/teams/:teamId/ideas/:ideaId", async ({ params, request }) => {
    await delay(320);
    if (params.teamId !== mockTeam.id) {
      return HttpResponse.json(
        { message: "Команда не найдена" },
        { status: 404 },
      );
    }
    const payload = (await request.json()) as Partial<Idea>;
    const idx = ideasStore.findIndex((idea) => idea.id === params.ideaId);
    if (idx === -1) {
      return HttpResponse.json(
        { message: "Идея не найдена" },
        { status: 404 },
      );
    }
    ideasStore[idx] = { ...ideasStore[idx], ...payload };
    return HttpResponse.json(ideasStore[idx]);
  }),

  http.get("/teams/:id/progress", async ({ params }) => {
    await delay(200);
    if (params.id !== mockTeam.id) {
      return HttpResponse.json(
        { message: "Команда не найдена" },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      progress: mockTeam.progress,
      completedTasks: ["taskA"],
      unlockedKeys: Array.from(submittedKeys),
    });
  }),

  http.get("/admin/levels", async () => {
    await delay(240);
    return HttpResponse.json(levelsStore);
  }),

  http.post("/admin/levels", async ({ request }) => {
    await delay(320);
    const payload = (await request.json()) as Level;
    const level: Level = {
      ...payload,
      id: payload.id ?? `lvl-${Date.now()}`,
    };
    levelsStore = [...levelsStore, level];
    return HttpResponse.json(level, { status: 201 });
  }),

  http.put("/admin/levels/:id", async ({ params, request }) => {
    await delay(320);
    const payload = (await request.json()) as Partial<Level>;
    const idx = levelsStore.findIndex((lvl) => lvl.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { message: "Уровень не найден" },
        { status: 404 },
      );
    }
    levelsStore[idx] = { ...levelsStore[idx], ...payload };
    return HttpResponse.json(levelsStore[idx]);
  }),

  http.get("/admin/moderation/comments", async () => {
    await delay(200);
    return HttpResponse.json(commentsStore);
  }),

  http.post("/admin/moderation/comments/:id/hide", async ({ params }) => {
    await delay(210);
    const idx = commentsStore.findIndex((comment) => comment.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { message: "Комментарий не найден" },
        { status: 404 },
      );
    }
    commentsStore[idx] = { ...commentsStore[idx], status: "hidden" };
    return HttpResponse.json(commentsStore[idx]);
  }),

  http.get("/admin/metrics", async () => {
    await delay(200);
    return HttpResponse.json(mockAdminMetrics);
  }),

  http.post("/validator/check", async ({ request }) => {
    await delay(260);
    const { code } = (await request.json()) as { code?: string };
    if (!code) {
      return HttpResponse.json(
        { status: "invalid", message: "Введите код" },
        { status: 422 },
      );
    }
    const normalized = code.trim().toUpperCase();
    if (normalized === ticketStore.qr) {
      return HttpResponse.json({
        status: "valid",
        message: "Пропуск действителен. Приятной инициализации.",
      });
    }
    return HttpResponse.json({
      status: "invalid",
      message: "Код не распознан системой E.V.M.",
    });
  }),
];

