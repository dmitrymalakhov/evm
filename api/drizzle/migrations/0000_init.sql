CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `name` text NOT NULL,
  `role` text NOT NULL,
  `team_id` text,
  `title` text,
  `avatar_url` text,
  `tab_number` text NOT NULL,
  `otp_code` text NOT NULL,
  `created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
  `updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);

--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_tab_number_idx` ON `users` (`tab_number`);

--> statement-breakpoint
CREATE TABLE `teams` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slogan` text,
  `progress` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TABLE `team_members` (
  `team_id` text NOT NULL,
  `user_id` text NOT NULL,
  `joined_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_idx` ON `team_members` (`team_id`,`user_id`);

--> statement-breakpoint
CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `access_token` text NOT NULL,
  `refresh_token` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_access_token_idx` ON `sessions` (`access_token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_idx` ON `sessions` (`refresh_token`);

--> statement-breakpoint
CREATE TABLE `feature_flags` (
  `id` integer PRIMARY KEY NOT NULL,
  `realtime` integer DEFAULT 1 NOT NULL,
  `payments` integer DEFAULT 0 NOT NULL,
  `admin` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
CREATE TABLE `levels` (
  `id` text PRIMARY KEY NOT NULL,
  `week` integer NOT NULL,
  `title` text NOT NULL,
  `state` text NOT NULL,
  `opens_at` text NOT NULL,
  `closes_at` text NOT NULL,
  `storyline` text NOT NULL,
  `hint` text
);

--> statement-breakpoint
CREATE UNIQUE INDEX `levels_week_idx` ON `levels` (`week`);

--> statement-breakpoint
CREATE TABLE `tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `level_id` text NOT NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `points` integer NOT NULL,
  `config` text NOT NULL,
  FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE TABLE `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `parent_id` text,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `user_id` text NOT NULL,
  `body` text NOT NULL,
  `created_at` text NOT NULL,
  `status` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE TABLE `thoughts` (
  `id` text PRIMARY KEY NOT NULL,
  `text` text NOT NULL,
  `created_at` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `qr` text NOT NULL,
  `pdf_url` text NOT NULL,
  `status` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE TABLE `chat_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL,
  `user_id` text NOT NULL,
  `user_name` text NOT NULL,
  `body` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE TABLE `ideas` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `votes` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE TABLE `team_progress` (
  `team_id` text PRIMARY KEY NOT NULL,
  `progress` integer DEFAULT 0 NOT NULL,
  `completed_tasks` text NOT NULL,
  `unlocked_keys` text NOT NULL,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE TABLE `admin_metrics` (
  `id` integer PRIMARY KEY NOT NULL,
  `dau` text NOT NULL,
  `wau` text NOT NULL,
  `funnel` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `validator_codes` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `status` text NOT NULL,
  `message` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `task_submissions` (
  `id` text PRIMARY KEY NOT NULL,
  `task_id` text NOT NULL,
  `user_id` text NOT NULL,
  `payload` text NOT NULL,
  `status` text NOT NULL,
  `hint` text,
  `message` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
