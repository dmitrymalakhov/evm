CREATE TABLE IF NOT EXISTS `user_actions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `action_type` text NOT NULL,
  `entity_type` text,
  `entity_id` text,
  `metadata` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `user_actions_user_id_idx` ON `user_actions` (`user_id`);
CREATE INDEX IF NOT EXISTS `user_actions_created_at_idx` ON `user_actions` (`created_at`);
CREATE INDEX IF NOT EXISTS `user_actions_action_type_idx` ON `user_actions` (`action_type`);

