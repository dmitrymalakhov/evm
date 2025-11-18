import { and, eq, ne } from "drizzle-orm";

import { db } from "../db/client.js";
import { secretSantaParticipants, users } from "../db/schema.js";

export type SecretSantaParticipantStatus = "waiting" | "matched" | "gifted";

type ParticipantRow = {
  entryId: string;
  userId: string;
  wishlist: string;
  status: SecretSantaParticipantStatus;
  reminderNote: string | null;
  matchedUserId: string | null;
  name: string | null;
  department: string | null;
};

type ParticipantView = {
  id: string;
  name: string;
  department: string;
  wishlist: string;
  status: SecretSantaParticipantStatus;
};

type SecretSantaState = {
  participants: ParticipantView[];
  stats: {
    total: number;
    matched: number;
    gifted: number;
  };
  me: {
    participant: (ParticipantView & {
      reminderNote: string | null;
      matchedUserId: string | null;
    }) | null;
    recipient: ParticipantView | null;
  };
};

export class SecretSantaError extends Error {
  code: "not_registered" | "already_matched" | "no_candidates" | "no_match";

  constructor(code: SecretSantaError["code"]) {
    super(code);
    this.code = code;
    this.name = "SecretSantaError";
  }
}

const DEFAULT_DEPARTMENT = "Участник E.V.M.";

function mapRowToView(row: ParticipantRow): ParticipantView {
  return {
    id: row.userId,
    name: row.name ?? "Неизвестный агент",
    department: row.department ?? DEFAULT_DEPARTMENT,
    wishlist: row.wishlist,
    status: row.status,
  };
}

function fetchParticipantRows(): ParticipantRow[] {
  return db
    .select({
      entryId: secretSantaParticipants.id,
      userId: secretSantaParticipants.userId,
      wishlist: secretSantaParticipants.wishlist,
      status: secretSantaParticipants.status,
      reminderNote: secretSantaParticipants.reminderNote,
      matchedUserId: secretSantaParticipants.matchedUserId,
      name: users.name,
      department: users.title,
    })
    .from(secretSantaParticipants)
    .innerJoin(users, eq(secretSantaParticipants.userId, users.id))
    .all()
    .map((row) => ({
      ...row,
      status: (row.status ??
        "waiting") as SecretSantaParticipantStatus,
    }));
}

export function getSecretSantaState(userId?: string | null): SecretSantaState {
  const rows = fetchParticipantRows();
  const participants = rows.map(mapRowToView);
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const meRow = rows.find((row) => row.userId === userId) ?? null;

  const meParticipant = meRow
    ? {
        ...mapRowToView(meRow),
        reminderNote: meRow.reminderNote,
        matchedUserId: meRow.matchedUserId,
      }
    : null;

  const recipient = meRow?.matchedUserId
    ? participantById.get(meRow.matchedUserId) ?? null
    : null;

  return {
    participants,
    stats: {
      total: participants.length,
      matched: participants.filter((participant) => participant.status !== "waiting").length,
      gifted: participants.filter((participant) => participant.status === "gifted").length,
    },
    me: {
      participant: meParticipant,
      recipient,
    },
  };
}

export function registerSecretSantaParticipant(payload: {
  userId: string;
  wishlist: string;
  reminderNote?: string | null;
}) {
  const normalizedReminder = payload.reminderNote?.trim() ? payload.reminderNote.trim() : null;
  const now = new Date();

  const existing = db
    .select()
    .from(secretSantaParticipants)
    .where(eq(secretSantaParticipants.userId, payload.userId))
    .get();

  if (existing) {
    db.update(secretSantaParticipants)
      .set({
        wishlist: payload.wishlist,
        reminderNote: normalizedReminder,
        updatedAt: now,
      })
      .where(eq(secretSantaParticipants.userId, payload.userId))
      .run();
  } else {
    db.insert(secretSantaParticipants)
      .values({
        id: crypto.randomUUID(),
        userId: payload.userId,
        wishlist: payload.wishlist,
        status: "waiting",
        reminderNote: normalizedReminder,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  return getSecretSantaState(payload.userId);
}

export function drawSecretSantaRecipient(userId: string) {
  const now = new Date();

  db.transaction((tx) => {
    const participant = tx
      .select()
      .from(secretSantaParticipants)
      .where(eq(secretSantaParticipants.userId, userId))
      .get();

    if (!participant) {
      throw new SecretSantaError("not_registered");
    }

    if (participant.matchedUserId) {
      throw new SecretSantaError("already_matched");
    }

    // Get candidates who haven't been matched yet
    const candidates = tx
      .select({
        userId: secretSantaParticipants.userId,
      })
      .from(secretSantaParticipants)
      .where(
        and(
          ne(secretSantaParticipants.userId, userId),
          eq(secretSantaParticipants.matchedUserId, null),
        ),
      )
      .all();

    if (candidates.length === 0) {
      throw new SecretSantaError("no_candidates");
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];

    tx.update(secretSantaParticipants)
      .set({
        matchedUserId: target.userId,
        status: "matched",
        matchedAt: now,
        updatedAt: now,
      })
      .where(eq(secretSantaParticipants.userId, userId))
      .run();
  });

  return getSecretSantaState(userId);
}

export function markSecretSantaGifted(userId: string) {
  const now = new Date();

  const participant = db
    .select()
    .from(secretSantaParticipants)
    .where(eq(secretSantaParticipants.userId, userId))
    .get();

  if (!participant) {
    throw new SecretSantaError("not_registered");
  }

  if (!participant.matchedUserId) {
    throw new SecretSantaError("no_match");
  }

  db.update(secretSantaParticipants)
    .set({
      status: "gifted",
      giftedAt: now,
      updatedAt: now,
    })
    .where(eq(secretSantaParticipants.userId, userId))
    .run();

  return getSecretSantaState(userId);
}

export function updateSecretSantaReminder(userId: string, reminderNote: string) {
  const participant = db
    .select()
    .from(secretSantaParticipants)
    .where(eq(secretSantaParticipants.userId, userId))
    .get();

  if (!participant) {
    throw new SecretSantaError("not_registered");
  }

  const normalizedReminder = reminderNote.trim() ? reminderNote.trim() : null;

  db.update(secretSantaParticipants)
    .set({
      reminderNote: normalizedReminder,
      updatedAt: new Date(),
    })
    .where(eq(secretSantaParticipants.userId, userId))
    .run();

  return getSecretSantaState(userId);
}

