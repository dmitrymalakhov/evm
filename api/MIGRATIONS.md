# Инструкция по применению миграций базы данных

## Проблема

Если при входе в систему возникает ошибка `no such column: "will_drink_alcohol"`, это означает, что миграции базы данных не были применены.

## Автоматическое применение миграций

Миграции применяются автоматически при запуске API сервера через `src/db/client.ts`. Убедитесь, что:

1. Файл `drizzle/meta/_journal.json` содержит все миграции
2. Файлы миграций находятся в папке `drizzle/migrations/`
3. Переменная окружения `DRIZZLE_MIGRATE` не установлена в `false`

## Ручное применение миграций

### Вариант 1: Через скрипт (рекомендуется)

```bash
# На сервере
cd /opt/evm/api
pnpm db:migrate
```

Или если используете Docker:

```bash
# В контейнере API
docker exec -it evm-api-1 pnpm db:migrate
```

### Вариант 2: Через перезапуск контейнера

Миграции применяются автоматически при запуске. Просто перезапустите контейнер:

```bash
ssh root@207.154.207.198 "cd /opt/evm && docker-compose restart api"
```

### Вариант 3: Через Node.js напрямую

```bash
# На сервере
cd /opt/evm/api
node -e "import('./dist/db/client.js')"
```

## Проверка примененных миграций

Проверить, какие миграции применены, можно через SQLite:

```bash
# На сервере
cd /opt/evm/api
sqlite3 sqlite/evm.sqlite "SELECT * FROM __drizzle_migrations ORDER BY created_at;"
```

## Список миграций

- `0000_init` - Инициализация базы данных
- `0001_add_idea_votes` - Добавление голосов за идеи
- `0002_add_iterations_and_progress` - Добавление итераций и прогресса
- `0003_add_user_actions` - Добавление действий пользователей
- `0004_add_secret_santa` - Добавление Secret Santa
- `0005_add_user_status` - Добавление статуса пользователя
- `0006_add_telegram_id` - Добавление Telegram ID
- `0007_add_alcohol_preferences` - **Добавление алкогольных предпочтений (will_drink_alcohol, alcohol_preference)**
- `0008_add_grade_and_payment` - Добавление грейда и оплаты

## Решение проблемы с отсутствующими колонками

Если после применения миграций проблема сохраняется:

1. Проверьте, что файл `drizzle/meta/_journal.json` содержит все миграции
2. Убедитесь, что файлы миграций скопированы на сервер
3. Проверьте логи при запуске API - должны быть сообщения о применении миграций
4. При необходимости примените миграции вручную через SQL:

```sql
-- Для миграции 0007
ALTER TABLE `users` ADD COLUMN `will_drink_alcohol` integer;
ALTER TABLE `users` ADD COLUMN `alcohol_preference` text;

-- Для миграции 0008
ALTER TABLE `users` ADD COLUMN `grade` integer;
ALTER TABLE `users` ADD COLUMN `has_paid` integer;
```

## Важные замечания

- Миграции применяются автоматически при каждом запуске API
- Drizzle отслеживает примененные миграции в таблице `__drizzle_migrations`
- Повторное применение миграций безопасно - Drizzle пропустит уже примененные
- Всегда делайте backup базы данных перед применением миграций в продакшене


