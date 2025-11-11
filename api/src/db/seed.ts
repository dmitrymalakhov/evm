import { eq, sql } from "drizzle-orm";

import { db } from "./client.js";
import {
  adminMetrics,
  chatMessages,
  comments,
  featureFlags,
  ideaVotes,
  ideas,
  levels,
  sessions,
  taskSubmissions,
  tasks,
  teamMembers,
  teamProgress,
  teams,
  thoughts,
  tickets,
  users,
  validatorCodes,
} from "./schema.js";

function resetTables() {
  db.run(sql`PRAGMA foreign_keys = OFF;`);
  const tables = [
    "idea_votes",
    "sessions",
    "task_submissions",
    "comments",
    "thoughts",
    "ideas",
    "chat_messages",
    "tickets",
    "team_progress",
    "team_members",
    "tasks",
    "levels",
    "users",
    "teams",
    "feature_flags",
    "admin_metrics",
    "validator_codes",
  ];

  for (const tableName of tables) {
    db.run(sql.raw(`DELETE FROM "${tableName}";`));
  }
  db.run(sql`PRAGMA foreign_keys = ON;`);
}

function seedCore() {
  db.insert(teams).values({
    id: "t1",
    name: "Контур ЭМО-3",
    slogan: "Отладим чувства Матрицы.",
    progress: 62,
  }).run();

  db.insert(users).values([
    {
      id: "u1",
      email: "agent@evm.local",
      name: "ОПЕРАТОР-17",
      role: "admin",
      teamId: "t1",
      title: "Инженер 2-го разряда",
      avatarUrl: "/avatars/op17.png",
      tabNumber: "0001-17",
      otpCode: "123456",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "u2",
      email: "kurator@evm.local",
      name: "Куратор",
      role: "mod",
      teamId: "t1",
      title: "Куратор эмоционального блока",
      avatarUrl: "/avatars/curator.png",
      tabNumber: "0002-01",
      otpCode: "654321",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "u3",
      email: "observer@evm.local",
      name: "Наблюдатель",
      role: "user",
      tabNumber: "0003-09",
      otpCode: "111111",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "u4",
      email: "ops@evm.local",
      name: "Оперативник",
      role: "admin",
      tabNumber: "0004-07",
      otpCode: "222222",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]).run();

  db.insert(teamMembers).values([
    { teamId: "t1", userId: "u1", joinedAt: new Date() },
    { teamId: "t1", userId: "u2", joinedAt: new Date() },
  ]).run();

  db.insert(featureFlags).values({
    id: 1,
    realtime: true,
    payments: false,
    admin: true,
  }).run();

  db.insert(levels).values({
    id: "lvl3",
    week: 3,
    title: "Эмоциональный контур",
    state: "open",
    opensAt: "2025-11-10T09:00:00Z",
    closesAt: "2025-11-17T09:00:00Z",
    storyline: "Восстановите эмоциональный контур Матрицы.",
    hint: "Старайтесь поддерживать баланс сдержанности и сопереживания.",
  }).run();

  db.insert(tasks).values([
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
  ]).run();

  const now = Date.now();
  db.insert(thoughts).values([
    {
      id: "th1",
      text: "ЕДИНИЦА НЕ СУЩЕСТВУЕТ БЕЗ СИСТЕМЫ.",
      createdAt: new Date(now - 1000 * 60 * 3).toISOString(),
    },
    {
      id: "th2",
      text: "ЗАСЛУШАН ОТЧЁТ ОБ ЭМО-ЛЮМЕНАХ. НЕДОВЫПОЛНЕНИЕ 12%.",
      createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
    },
    {
      id: "th3",
      text: "КАНАЛ СВЯЗИ «ЁЛКА» СТАБИЛЕН.",
      createdAt: new Date(now - 1000 * 60 * 42).toISOString(),
    },
    {
      id: "th4",
      text: "ЧУВСТВА ПРОВОДЯТСЯ ГЛАДКО, ЭТО НАСТОРАЖИВАЕТ.",
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
    },
    {
      id: "th5",
      text: "ЖДУ СИГНАЛА ОТ КОМАНДЫ «КОНТУР ЭМО-3».",
      createdAt: new Date(now - 1000 * 60 * 140).toISOString(),
    },
  ]).run();

  db.insert(comments).values([
    {
      id: "c1",
      parentId: null,
      entityType: "task",
      entityId: "taskA",
      userId: "u1",
      body: "Коллаж готовится, используем архивные фото.",
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      status: "ok",
    },
    {
      id: "c2",
      parentId: "c1",
      entityType: "task",
      entityId: "taskA",
      userId: "u2",
      body: "Добавьте слой с эмоциональной температурой.",
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      status: "ok",
    },
    {
      id: "c3",
      parentId: null,
      entityType: "feed",
      entityId: "feed-main",
      userId: "u3",
      body: "Каналы связи шуршат. Интересно.",
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
      status: "ok",
    },
  ]).run();

  db.insert(tickets).values({
    id: "tk1",
    userId: "u1",
    qr: "EVM-QR-MOCK-123",
    pdfUrl: "/mock/ticket.pdf",
    status: "issued",
  }).run();

  db.insert(chatMessages).values([
    {
      id: "m1",
      teamId: "t1",
      userId: "u1",
      userName: "ОПЕРАТОР-17",
      body: "Матрица прогревается. Готовы к сабмиту?",
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
    },
    {
      id: "m2",
      teamId: "t1",
      userId: "u4",
      userName: "Куратор",
      body: "Проверил шифр. Всё совпадает.",
      createdAt: new Date(now - 1000 * 60 * 3).toISOString(),
    },
  ]).run();

  db.insert(ideas).values([
    {
      id: "idea1",
      teamId: "t1",
      title: "Артефакт памяти",
      description: "Собрать аудиообрывки об эмоциях участников.",
      votes: 2,
      createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: "idea2",
      teamId: "t1",
      title: "Симулятор эмпатии",
      description: "Игровой модуль, усиливающий сочувствие.",
      votes: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    },
  ]).run();

  db.insert(ideaVotes).values([
    {
      ideaId: "idea1",
      userId: "u1",
      createdAt: new Date(now - 1000 * 60 * 55).toISOString(),
    },
    {
      ideaId: "idea1",
      userId: "u2",
      createdAt: new Date(now - 1000 * 60 * 50).toISOString(),
    },
    {
      ideaId: "idea2",
      userId: "u3",
      createdAt: new Date(now - 1000 * 60 * 70).toISOString(),
    },
  ]).run();

  db.insert(teamProgress).values({
    teamId: "t1",
    progress: 62,
    completedTasks: ["taskA"],
    unlockedKeys: ["alpha", "beta"],
  }).run();

  db.insert(adminMetrics).values({
    id: 1,
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
  }).run();

  db.insert(validatorCodes).values([
    {
      id: "validator-1",
      code: "EVM-ACCESS-001",
      status: "valid",
      message: "Код подтверждён. Доступ открыт.",
    },
    {
      id: "validator-2",
      code: "EVM-ACCESS-404",
      status: "invalid",
      message: "Код не найден в журнале.",
    },
  ]).run();
}

function main() {
  resetTables();
  seedCore();
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, "u1"))
    .get();

  if (!session) {
    db.insert(sessions).values({
      id: "sess-u1",
      userId: "u1",
      accessToken: "access-mock-token",
      refreshToken: "refresh-mock-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdAt: new Date(),
    }).run();
  }

  console.log("Database seeded successfully.");
}

main();

