import { relations } from "drizzle-orm";
import {
    index,
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
} from "../types/contracts.js";

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
        status: text("status").default("active"),
        createdAt: integer("created_at", { mode: "timestamp" })
            .$defaultFn(() => new Date())
            .notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .$defaultFn(() => new Date())
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
            .$defaultFn(() => new Date())
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
            .$defaultFn(() => new Date())
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

export const iterations = sqliteTable("iterations", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
    totalWeeks: integer("total_weeks").notNull().default(6),
    currentWeek: integer("current_week").notNull().default(1),
});

export const levels = sqliteTable(
    "levels",
    {
        id: text("id").primaryKey(),
        iterationId: text("iteration_id")
            .references(() => iterations.id, { onDelete: "set null" }),
        week: integer("week").notNull(),
        title: text("title").notNull(),
        state: text("state").notNull().$type<LevelState>(),
        opensAt: text("opens_at").notNull(),
        closesAt: text("closes_at").notNull(),
        storyline: text("storyline").notNull(),
        hint: text("hint"),
    },
    (table) => ({
        weekIdx: uniqueIndex("levels_iteration_week_idx").on(
            table.iterationId,
            table.week,
        ),
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
    totalPoints: integer("total_points").notNull().default(0),
    completedTasks: text("completed_tasks", { mode: "json" })
        .notNull()
        .$type<string[]>(),
    unlockedKeys: text("unlocked_keys", { mode: "json" })
        .notNull()
        .$type<string[]>(),
    completedWeeks: text("completed_weeks", { mode: "json" })
        .notNull()
        .default(JSON.stringify([]))
        .$type<number[]>(),
    weeklyStats: text("weekly_stats", { mode: "json" })
        .notNull()
        .default(JSON.stringify([]))
        .$type<Array<{ week: number; points: number; tasksCompleted: number }>>(),
});

export const userWeekProgress = sqliteTable(
    "user_week_progress",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        iterationId: text("iteration_id")
            .notNull()
            .references(() => iterations.id, { onDelete: "cascade" }),
        week: integer("week").notNull(),
        completedTasks: text("completed_tasks", { mode: "json" })
            .notNull()
            .default(JSON.stringify([]))
            .$type<string[]>(),
        pointsEarned: integer("points_earned").notNull().default(0),
        isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
        finishedAt: integer("finished_at", { mode: "timestamp" }),
        keyId: text("key_id"),
        title: text("title"),
    },
    (table) => ({
        uniqueUserWeek: uniqueIndex("user_week_iteration_idx").on(
            table.userId,
            table.iterationId,
            table.week,
        ),
    }),
);

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

export const userActions = sqliteTable(
    "user_actions",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        actionType: text("action_type").notNull(),
        entityType: text("entity_type"),
        entityId: text("entity_id"),
        metadata: text("metadata", { mode: "json" })
            .$type<Record<string, unknown>>(),
        createdAt: integer("created_at", { mode: "timestamp" })
            .$defaultFn(() => new Date())
            .notNull(),
    },
    (table) => ({
        userIdIdx: index("user_actions_user_id_idx").on(table.userId),
        createdAtIdx: index("user_actions_created_at_idx").on(table.createdAt),
        actionTypeIdx: index("user_actions_action_type_idx").on(table.actionType),
    }),
);

export const secretSantaParticipants = sqliteTable(
    "secret_santa_participants",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        wishlist: text("wishlist").notNull(),
        status: text("status").notNull(),
        reminderNote: text("reminder_note"),
        matchedUserId: text("matched_user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        matchedAt: integer("matched_at", { mode: "timestamp" }),
        giftedAt: integer("gifted_at", { mode: "timestamp" }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .$defaultFn(() => new Date())
            .notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .$defaultFn(() => new Date())
            .notNull(),
    },
    (table) => ({
        userIdIdx: uniqueIndex("secret_santa_user_idx").on(table.userId),
        matchedIdx: index("secret_santa_matched_idx").on(table.matchedUserId),
    }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
    team: one(teams, {
        fields: [users.teamId],
        references: [teams.id],
    }),
    sessions: many(sessions),
    tickets: many(tickets),
    weeklyProgress: many(userWeekProgress),
    actions: many(userActions),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
    members: many(teamMembers),
    chatMessages: many(chatMessages),
    ideas: many(ideas),
    progress: one(teamProgress),
}));

export const iterationsRelations = relations(iterations, ({ many }) => ({
    levels: many(levels),
    weeklyProgress: many(userWeekProgress),
}));

export const levelsRelations = relations(levels, ({ one, many }) => ({
    iteration: one(iterations, {
        fields: [levels.iterationId],
        references: [iterations.id],
    }),
    tasks: many(tasks),
}));

export const userWeekProgressRelations = relations(
    userWeekProgress,
    ({ one }) => ({
        user: one(users, {
            fields: [userWeekProgress.userId],
            references: [users.id],
        }),
        iteration: one(iterations, {
            fields: [userWeekProgress.iterationId],
            references: [iterations.id],
        }),
    }),
);

