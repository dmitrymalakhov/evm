-- Добавляем поля для хранения информации о грейде и оплате пользователя
-- grade - грейд пользователя, выбранный в боте (8-13)
-- has_paid - провел ли пользователь оплату (true/false)
ALTER TABLE `users` ADD COLUMN `grade` integer;
ALTER TABLE `users` ADD COLUMN `has_paid` integer;


