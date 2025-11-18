CREATE TABLE IF NOT EXISTS `secret_santa_participants` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `wishlist` text NOT NULL,
  `status` text NOT NULL,
  `reminder_note` text,
  `matched_user_id` text,
  `matched_at` integer,
  `gifted_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`matched_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `secret_santa_user_idx` ON `secret_santa_participants` (`user_id`);
CREATE INDEX IF NOT EXISTS `secret_santa_matched_idx` ON `secret_santa_participants` (`matched_user_id`);

