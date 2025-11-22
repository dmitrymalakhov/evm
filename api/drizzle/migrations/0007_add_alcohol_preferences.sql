-- Добавляем поля для хранения информации об алкогольных предпочтениях пользователя
-- will_drink_alcohol - будет ли пользователь пить алкоголь (true/false)
-- alcohol_preference - предпочтение пользователя (вариант выбора или свой ввод)
ALTER TABLE `users` ADD COLUMN `will_drink_alcohol` integer;
ALTER TABLE `users` ADD COLUMN `alcohol_preference` text;

