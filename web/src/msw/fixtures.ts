import type {
  AdminMetrics,
  ChatMessage,
  Comment,
  Idea,
  Iteration,
  Level,
  Task,
  Team,
  TeamProgressSummary,
  Thought,
  ThoughtFeed,
  Ticket,
  User,
} from "@/types/contracts";

export const mockUser: User = {
  id: "u1",
  email: "agent@evm.local",
  name: "ОПЕРАТОР-17",
  role: "user",
  teamId: "t1",
  title: "Инженер 2-го разряда",
  avatarUrl: "/avatars/op17.png",
};

export const mockTeam: Team = {
  id: "t1",
  name: "Контур ЭМО-3",
  slogan: "Отладим чувства Матрицы.",
  progress: 62,
};

export const mockIteration: Iteration = {
  id: "iter-2025-11",
  name: "Цикл реинициализации эмоций",
  startsAt: "2025-11-03T09:00:00Z",
  endsAt: "2025-12-15T09:00:00Z",
  totalWeeks: 6,
  currentWeek: 3,
};

export const mockLevel: Level = {
  id: "lvl3",
  week: 3,
  title: "Эмоциональный контур",
  state: "open",
  opensAt: "2025-11-10T09:00:00Z",
  closesAt: "2025-11-17T09:00:00Z",
  iteration: mockIteration,
  config: {
    storyline: "Восстановите эмоциональный контур Матрицы.",
    hint: "Старайтесь поддерживать баланс сдержанности и сопереживания.",
  },
};

export const mockTasks: Task[] = [
  {
    id: "taskA",
    levelId: "lvl3",
    type: "upload",
    title: "Коллаж команды",
    description: "Загрузите общий коллаж, отражающий связь команды.",
    points: 50,
    config: {
      maxFiles: 3,
      acceptedTypes: ["image/png", "image/jpeg"],
    },
  },
  {
    id: "taskB",
    levelId: "lvl3",
    type: "vote",
    title: "Голос сердца",
    description: "Выберите самое человечное изображение.",
    points: 20,
    config: {
      choices: ["A", "B", "C"],
    },
  },
];

export const mockThoughts: Thought[] = [
  {
    id: "th1",
    text: "ЕДИНИЦА НЕ СУЩЕСТВУЕТ БЕЗ СИСТЕМЫ.",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "th2",
    text: "ЗАСЛУШАН ОТЧЁТ ОБ ЭМО-ЛЮМЕНАХ. НЕДОВЫПОЛНЕНИЕ 12%.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "th3",
    text: "КАНАЛ СВЯЗИ «ЁЛКА» СТАБИЛЕН.",
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "th4",
    text: "ЧУВСТВА ПРОВОДЯТСЯ ГЛАДКО, ЭТО НАСТОРАЖИВАЕТ.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "th5",
    text: "ЖДУ СИГНАЛА ОТ КОМАНДЫ «КОНТУР ЭМО-3».",
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
];

export const mockComments: Comment[] = [
  {
    id: "c1",
    entityType: "task",
    entityId: "taskA",
    userId: "u1",
    body: "Коллаж готовится, используем архивные фото.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: "ok",
  },
  {
    id: "c2",
    parentId: "c1",
    entityType: "task",
    entityId: "taskA",
    userId: "u2",
    body: "Добавьте слой с эмоциональной температурой.",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: "ok",
  },
  {
    id: "c3",
    entityType: "feed",
    entityId: "feed-main",
    userId: "u3",
    body: "Каналы связи шуршат. Интересно.",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    status: "ok",
  },
];

export const mockTicket: Ticket = {
  id: "tk1",
  userId: "u1",
  qr: "EVM-QR-MOCK-123",
  pdfUrl: "/mock/ticket.pdf",
  status: "issued",
};

export const mockChatMessages: ChatMessage[] = [
  {
    id: "m1",
    teamId: "t1",
    userId: "u1",
    userName: "ОПЕРАТОР-17",
    body: "Матрица прогревается. Готовы к сабмиту?",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "m2",
    teamId: "t1",
    userId: "u4",
    userName: "Куратор",
    body: "Проверил шифр. Всё совпадает.",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
];

export const mockIdeas: Idea[] = [
  {
    id: "idea1",
    teamId: "t1",
    title: "Артефакт памяти",
    description: "Собрать аудиообрывки об эмоциях участников.",
    votes: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    userHasVoted: false,
  },
  {
    id: "idea2",
    teamId: "t1",
    title: "Симулятор эмпатии",
    description: "Игровой модуль, усиливающий сочувствие.",
    votes: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    userHasVoted: false,
  },
];

export const mockTeamProgress: TeamProgressSummary = {
  progress: 62,
  totalPoints: 70,
  completedTasks: ["taskA"],
  unlockedKeys: ["alpha", "beta"],
  completedWeeks: [1, 2],
  weeklyStats: [
    { week: 1, points: 30, tasksCompleted: 6 },
    { week: 2, points: 40, tasksCompleted: 7 },
  ],
};

export const mockThoughtFeed: ThoughtFeed = {
  thoughts: mockThoughts,
  comments: mockComments,
};

export const mockAdminMetrics: AdminMetrics = {
  dau: [
    { label: "Пн", value: 210 },
    { label: "Вт", value: 240 },
    { label: "Ср", value: 260 },
    { label: "Чт", value: 280 },
    { label: "Пт", value: 310 },
  ],
  wau: [
    { label: "Неделя 41", value: 860 },
    { label: "Неделя 42", value: 910 },
    { label: "Неделя 43", value: 980 },
    { label: "Неделя 44", value: 1020 },
    { label: "Неделя 45", value: 1105 },
  ],
  funnel: [
    { step: "Пробуждение", value: 1800 },
    { step: "Регистрация", value: 1500 },
    { step: "Активация EVM", value: 1120 },
    { step: "Получили билет", value: 760 },
  ],
};

