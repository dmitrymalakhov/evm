import { relations } from "drizzle-orm";
import {
    integer,
    primaryKey,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type {
    AdminMetrics,
    CommentStatus,
    LevelState,
    Role,
    TaskConfig,
    TaskType,
    ValidatorResponse,
} from "../types/contracts";

export const users = sqliteTable(
    "users",
    {
        id: text("id").primaryKey(),
        email: text("email").notNull(),
        name: text("name").notNull(),
        role: text("role").notNull().$type<Role>(),
        teamId: text("team_id"),
        title: text("title"),
        avatarUrl: text("avatar_url"),
        tabNumber: text("tab_number").notNull(),
        otpCode: text("otp_code").notNull(),
        createdAt: integer("created_at", { mode: "timestamp" })
            .default(() => new Date())
            .notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .default(() => new Date())
            .notNull(),
    },
    (table) => ({
        emailIdx: uniqueIndex("users_email_idx").on(table.email),
        tabNumberIdx: uniqueIndex("users_tab_number_idx").on(table.tabNumber),
    }),
);

export const teams = sqliteTable("teams", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slogan: text("slogan"),
    progress: integer("progress").notNull().default(0),
});

export const teamMembers = sqliteTable(
    "team_members",
    {
        teamId: text("team_id")
            .notNull()
            .references(() => teams.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        joinedAt: integer("joined_at", { mode: "timestamp" })
            .default(() => new Date())
            .notNull(),
    },
    (table) => ({
        pk: uniqueIndex("team_members_idx").on(table.teamId, table.userId),
    }),
);

export const sessions = sqliteTable(
    "sessions",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accessToken: text("access_token").notNull(),
        refreshToken: text("refresh_token").notNull(),
        expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
        createdAt: integer("created_at", { mode: "timestamp" })
            .default(() => new Date())
            .notNull(),
    },
    (table) => ({
        accessTokenIdx: uniqueIndex("sessions_access_token_idx").on(
            table.accessToken,
        ),
        refreshTokenIdx: uniqueIndex("sessions_refresh_token_idx").on(
            table.refreshToken,
        ),
    }),
);

export const featureFlags = sqliteTable("feature_flags", {
    id: integer("id").primaryKey(),
    realtime: integer("realtime", { mode: "boolean" }).notNull().default(true),
    payments: integer("payments", { mode: "boolean" }).notNull().default(false),
    admin: integer("admin", { mode: "boolean" }).notNull().default(true),
});

export const levels = sqliteTable(
    "levels",
    {
        id: text("id").primaryKey(),
        week: integer("week").notNull(),
        title: text("title").notNull(),
        state: text("state").notNull().$type<LevelState>(),
        opensAt: text("opens_at").notNull(),
        closesAt: text("closes_at").notNull(),
        storyline: text("storyline").notNull(),
        hint: text("hint"),
    },
    (table) => ({
        weekIdx: uniqueIndex("levels_week_idx").on(table.week),
    }),
);

export const tasks = sqliteTable("tasks", {
    id: text("id").primaryKey(),
    levelId: text("level_id")
        .notNull()
        .references(() => levels.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<TaskType>(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    points: integer("points").notNull(),
    config: text("config", { mode: "json" }).notNull().$type<TaskConfig>(),
});

export const comments = sqliteTable("comments", {
    id: text("id").primaryKey(),
    parentId: text("parent_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
    status: text("status").notNull().$type<CommentStatus>(),
});

export const thoughts = sqliteTable("thoughts", {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
    createdAt: text("created_at").notNull(),
});

export const tickets = sqliteTable("tickets", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    qr: text("qr").notNull(),
    pdfUrl: text("pdf_url").notNull(),
    status: text("status").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
    id: text("id").primaryKey(),
    teamId: text("team_id")
        .notNull()
        .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    userName: text("user_name").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
});

export const ideas = sqliteTable("ideas", {
    id: text("id").primaryKey(),
    teamId: text("team_id")
        .notNull()
        .references(() => teams.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    votes: integer("votes").notNull().default(0),
    createdAt: text("created_at").notNull(),
});

export const ideaVotes = sqliteTable(
    "idea_votes",
    {
        ideaId: text("idea_id")
            .notNull()
            .references(() => ideas.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: text("created_at").notNull(),
    },
    (table) => ({
        pk: primaryKey({ name: "idea_votes_pk", columns: [table.ideaId, table.userId] }),
    }),
);

export const teamProgress = sqliteTable("team_progress", {
    teamId: text("team_id")
        .primaryKey()
        .references(() => teams.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    completedTasks: text("completed_tasks", { mode: "json" })
        .notNull()
        .$type<string[]>(),
    unlockedKeys: text("unlocked_keys", { mode: "json" })
        .notNull()
        .$type<string[]>(),
});

export const adminMetrics = sqliteTable("admin_metrics", {
    id: integer("id").primaryKey(),
    dau: text("dau", { mode: "json" }).notNull().$type<AdminMetrics["dau"]>(),
    wau: text("wau", { mode: "json" }).notNull().$type<AdminMetrics["wau"]>(),
    funnel: text("funnel", { mode: "json" }).notNull().$type<
        AdminMetrics["funnel"]
    >(),
});

export const validatorCodes = sqliteTable("validator_codes", {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    status: text("status").notNull().$type<ValidatorResponse["status"]>(),
    message: text("message").notNull(),
});

export const taskSubmissions = sqliteTable("task_submissions", {
    id: text("id").primaryKey(),
    taskId: text("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    payload: text("payload", { mode: "json" })
        .notNull()
        .$type<Record<string, unknown>>(),
    status: text("status").notNull(),
    hint: text("hint"),
    message: text("message"),
    createdAt: text("created_at").notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
    team: one(teams, {
        fields: [users.teamId],
        references: [teams.id],
    }),
    sessions: many(sessions),
    tickets: many(tickets),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
    members: many(teamMembers),
    chatMessages: many(chatMessages),
    ideas: many(ideas),
    progress: one(teamProgress),
}));

