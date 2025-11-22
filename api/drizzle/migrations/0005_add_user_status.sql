-- Добавляем поле status (SQLite не поддерживает NOT NULL с DEFAULT в ALTER TABLE)
-- Сначала добавляем как nullable
ALTER TABLE `users` ADD COLUMN `status` text;

--> statement-breakpoint
-- Устанавливаем дефолтное значение для всех существующих записей
UPDATE `users` SET `status` = 'active' WHERE `status` IS NULL;

-- Теперь можно было бы добавить NOT NULL, но SQLite не поддерживает это в ALTER TABLE
-- Поэтому полагаемся на дефолтное значение в схеме Drizzle

