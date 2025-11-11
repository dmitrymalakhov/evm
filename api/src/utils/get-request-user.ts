import type { Request } from "express";

import { getDefaultUser, getUserByToken } from "../services/auth";

export function getRequestUser(request: Request, requireUser = false) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  const user = getUserByToken(token);

  if (user) {
    return user;
  }

  if (requireUser && !user) {
    const error = new Error("Пользователь не авторизован");
    error.name = "UnauthorizedError";
    throw error;
  }

  return getDefaultUser();
}

