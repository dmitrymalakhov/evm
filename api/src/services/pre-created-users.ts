import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { users } from "../db/schema";
import type { UserStatus } from "../types/contracts";
import {
  generateThematicNickname,
  generateTabNumber,
  generateOtpCode,
  generateEmailFromNickname,
} from "./user-generation";

export type PreCreatedUserInput = {
  email?: string;
  name?: string;
  role?: "user" | "mod" | "admin";
  teamId?: string;
  title?: string;
};

export type PreCreatedUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "mod" | "admin";
  teamId?: string;
  title?: string;
  tabNumber: string;
  otpCode: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Получить список всех предзаполненных пользователей (status = "pending")
 */
export function listPreCreatedUsers(): PreCreatedUser[] {
  return db
    .select()
    .from(users)
    .where(eq(users.status, "pending"))
    .all()
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? undefined,
      title: user.title ?? undefined,
      tabNumber: user.tabNumber,
      otpCode: user.otpCode,
      status: (user.status || "active") as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
}

/**
 * Создать предзаполненного пользователя
 */
export function createPreCreatedUser(
  input: PreCreatedUserInput,
): PreCreatedUser {
  // Получаем все существующие табельные номера
  const existingUsers = db.select({ tabNumber: users.tabNumber }).from(users).all();
  const existingTabNumbers = existingUsers.map((u) => u.tabNumber);

  // Генерируем данные
  const nickname = input.name || generateThematicNickname();
  const email = input.email || generateEmailFromNickname(nickname);
  const tabNumber = generateTabNumber(existingTabNumbers);
  const otpCode = generateOtpCode();
  const role = input.role || "user";

  // Проверяем уникальность email
  const existingUserByEmail = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingUserByEmail) {
    throw new Error(`Пользователь с email ${email} уже существует`);
  }

  // Проверяем уникальность табельного номера
  const existingUserByTab = db
    .select()
    .from(users)
    .where(eq(users.tabNumber, tabNumber))
    .get();

  if (existingUserByTab) {
    throw new Error(`Пользователь с табельным номером ${tabNumber} уже существует`);
  }

  const now = new Date();
  const userId = crypto.randomUUID();

  db.insert(users)
    .values({
      id: userId,
      email,
      name: nickname,
      role,
      teamId: input.teamId ?? null,
      title: input.title ?? null,
      tabNumber,
      otpCode,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = db.select().from(users).where(eq(users.id, userId)).get();

  if (!created) {
    throw new Error("Не удалось создать пользователя");
  }

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role,
    teamId: created.teamId ?? undefined,
    title: created.title ?? undefined,
    tabNumber: created.tabNumber,
    otpCode: created.otpCode,
    status: created.status as UserStatus,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Обновить предзаполненного пользователя
 */
export function updatePreCreatedUser(
  userId: string,
  input: Partial<PreCreatedUserInput>,
): PreCreatedUser | null {
  const existing = db.select().from(users).where(eq(users.id, userId)).get();

  if (!existing) {
    return null;
  }

  if (existing.status !== "pending") {
    throw new Error("Можно обновлять только предзаполненных пользователей (status = pending)");
  }

  // Проверяем уникальность email, если он изменяется
  if (input.email && input.email !== existing.email) {
    const existingUserByEmail = db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .get();

    if (existingUserByEmail) {
      throw new Error(`Пользователь с email ${input.email} уже существует`);
    }
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.email !== undefined) {
    updateData.email = input.email;
  }
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.role !== undefined) {
    updateData.role = input.role;
  }
  if (input.teamId !== undefined) {
    updateData.teamId = input.teamId || null;
  }
  if (input.title !== undefined) {
    updateData.title = input.title || null;
  }

  db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .run();

  const updated = db.select().from(users).where(eq(users.id, userId)).get();

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    teamId: updated.teamId ?? undefined,
    title: updated.title ?? undefined,
    tabNumber: updated.tabNumber,
    otpCode: updated.otpCode,
    status: updated.status as UserStatus,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Удалить предзаполненного пользователя
 */
export function deletePreCreatedUser(userId: string): boolean {
  const existing = db.select().from(users).where(eq(users.id, userId)).get();

  if (!existing) {
    return false;
  }

  if (existing.status !== "pending") {
    throw new Error("Можно удалять только предзаполненных пользователей (status = pending)");
  }

  db.delete(users).where(eq(users.id, userId)).run();

  return true;
}

/**
 * Активировать предзаполненного пользователя (изменить status на "active")
 */
export function activatePreCreatedUser(userId: string): PreCreatedUser | null {
  const existing = db.select().from(users).where(eq(users.id, userId)).get();

  if (!existing) {
    return null;
  }

  if (existing.status !== "pending") {
    throw new Error("Пользователь уже активирован или не является предзаполненным");
  }

  db.update(users)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .run();

  const updated = db.select().from(users).where(eq(users.id, userId)).get();

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    teamId: updated.teamId ?? undefined,
    title: updated.title ?? undefined,
    tabNumber: updated.tabNumber,
    otpCode: updated.otpCode,
    status: updated.status as UserStatus,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

