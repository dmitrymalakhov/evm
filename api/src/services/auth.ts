import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { sessions, users } from "../db/schema";

type LoginPayload = {
  tabNumber: string;
  otp: string;
};

export function loginWithOtp(payload: LoginPayload) {
  const tabNumber = payload.tabNumber?.trim().toUpperCase() ?? "";
  const otp = payload.otp?.trim() ?? "";

  if (!tabNumber || !otp) {
    throw new Error("Требуются табельный номер и одноразовый код.");
  }

  const user = db
    .select()
    .from(users)
    .where(and(eq(users.tabNumber, tabNumber), eq(users.otpCode, otp)))
    .get();

  if (!user) {
    throw new Error("Пользователь не найден или код неверен.");
  }

  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const expiresIn = 60 * 60; // seconds
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresIn * 1000);

  const existingSession = db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .get();

  if (existingSession) {
    db.update(sessions)
      .set({
        accessToken,
        refreshToken,
        expiresAt,
        createdAt: now,
      })
      .where(eq(sessions.id, existingSession.id))
      .run();
  } else {
    db.insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        accessToken,
        refreshToken,
        expiresAt,
        createdAt: now,
      })
      .run();
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    user,
  };
}

export function getUserByToken(accessToken?: string | null) {
  if (!accessToken) {
    return null;
  }
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.accessToken, accessToken))
    .get();
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();
  return user ?? null;
}

export function getDefaultUser() {
  return db.select().from(users).limit(1).get();
}

