-- Добавляем поле telegram_id для хранения Telegram ID пользователей
-- Это поле нужно для рассылок сообщений через Telegram бота
ALTER TABLE `users` ADD COLUMN `telegram_id` text;

--> statement-breakpoint
-- Создаем уникальный индекс для telegram_id
CREATE UNIQUE INDEX IF NOT EXISTS `users_telegram_id_idx` ON `users` (`telegram_id`);

--> statement-breakpoint
-- Заполняем telegram_id для существующих пользователей, зарегистрированных через Telegram
-- Извлекаем ID из поля id, если оно начинается с "telegram_"
UPDATE `users` SET `telegram_id` = REPLACE(`id`, 'telegram_', '') WHERE `id` LIKE 'telegram_%';

