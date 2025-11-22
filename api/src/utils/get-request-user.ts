import type { Request } from "express";

import { getUserByToken } from "../services/auth.js";

export function getRequestUser(request: Request, requireUser = false) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  const user = getUserByToken(token);

  if (user) {
    return user;
  }

  if (requireUser) {
    const error = new Error("Пользователь не авторизован");
    error.name = "UnauthorizedError";
    throw error;
  }

  // Не возвращаем дефолтного пользователя - это небезопасно
  return null;
}

