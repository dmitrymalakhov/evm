CREATE TABLE IF NOT EXISTS `iterations` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `starts_at` integer NOT NULL,
  `ends_at` integer NOT NULL,
  `total_weeks` integer NOT NULL DEFAULT 6,
  `current_week` integer NOT NULL DEFAULT 1
);

ALTER TABLE `levels` ADD COLUMN `iteration_id` text REFERENCES `iterations`(`id`) ON DELETE SET NULL;

DROP INDEX IF EXISTS `levels_week_idx`;
CREATE UNIQUE INDEX IF NOT EXISTS `levels_iteration_week_idx` ON `levels` (`iteration_id`, `week`);

ALTER TABLE `team_progress` ADD COLUMN `total_points` integer NOT NULL DEFAULT 0;
ALTER TABLE `team_progress` ADD COLUMN `completed_weeks` text NOT NULL DEFAULT '[]';
ALTER TABLE `team_progress` ADD COLUMN `weekly_stats` text NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS `user_week_progress` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `iteration_id` text NOT NULL,
  `week` integer NOT NULL,
  `completed_tasks` text NOT NULL DEFAULT '[]',
  `points_earned` integer NOT NULL DEFAULT 0,
  `is_completed` integer NOT NULL DEFAULT 0,
  `finished_at` integer,
  `key_id` text,
  `title` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`iteration_id`) REFERENCES `iterations`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_week_iteration_idx` ON `user_week_progress` (`user_id`, `iteration_id`, `week`);
