import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { tickets, validatorCodes } from "../db/schema";

export function validateCode(inputCode: string) {
  const code = inputCode.trim().toUpperCase();
  const validator = db
    .select()
    .from(validatorCodes)
    .where(eq(validatorCodes.code, code))
    .get();

  if (validator) {
    return {
      status: validator.status,
      message: validator.message,
    };
  }

  const ticket = db
    .select()
    .from(tickets)
    .where(eq(tickets.qr, code))
    .get();

  if (ticket) {
    return {
      status: "valid" as const,
      message: "Пропуск действителен. Приятной инициализации.",
    };
  }

  return {
    status: "invalid" as const,
    message: "Код не распознан системой E.V.M.",
  };
}

