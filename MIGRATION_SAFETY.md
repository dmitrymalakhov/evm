# Безопасность миграций базы данных

## ✅ Гарантии сохранности данных

При пересборке и пересоздании Docker контейнера база данных **НЕ будет удалена**, будут применяться только новые миграции.

## Как это работает

### 1. Volume для базы данных

База данных SQLite хранится в Docker volume `api_data`, который монтируется в `/app/data`:
- Volume **не удаляется** при пересборке контейнера
- Volume **не удаляется** при `docker-compose down` (без флага `-v`)
- Данные сохраняются между перезапусками

### 2. Отслеживание миграций Drizzle ORM

Drizzle ORM автоматически отслеживает примененные миграции в специальной таблице `__drizzle_migrations`:
- Каждая миграция применяется **только один раз**
- При перезапуске контейнера уже примененные миграции **пропускаются**
- Применяются только **новые** миграции, которых еще нет в базе

### 3. Безопасность операций миграций

Все миграции используют только безопасные операции:

#### ✅ Безопасные операции (используются):
- `CREATE TABLE IF NOT EXISTS` - создает таблицу только если её нет
- `ALTER TABLE ADD COLUMN` - добавляет колонки, не удаляет данные
- `CREATE INDEX IF NOT EXISTS` - создает индекс только если его нет
- `UPDATE ... WHERE` - обновляет данные по условию
- `DROP INDEX IF EXISTS` - удаляет индекс (не данные)

#### ❌ Опасные операции (НЕ используются):
- `DROP TABLE` - удаление таблиц
- `DELETE FROM` - удаление данных
- `TRUNCATE` - очистка таблиц
- `ALTER TABLE DROP COLUMN` - удаление колонок

### 4. Проверка миграций

Все существующие миграции проверены на безопасность:

| Миграция | Операции | Безопасность |
|----------|----------|--------------|
| `0000_init.sql` | CREATE TABLE, CREATE INDEX | ✅ Безопасно |
| `0001_add_idea_votes.sql` | CREATE TABLE | ✅ Безопасно |
| `0002_add_iterations_and_progress.sql` | CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN, DROP INDEX IF EXISTS | ✅ Безопасно |
| `0003_add_user_actions.sql` | CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS | ✅ Безопасно |
| `0004_add_secret_santa.sql` | CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS | ✅ Безопасно |
| `0005_add_user_status.sql` | ALTER TABLE ADD COLUMN, UPDATE | ✅ Безопасно |
| `0006_add_telegram_id.sql` | ALTER TABLE ADD COLUMN, CREATE INDEX, UPDATE | ✅ Безопасно |
| `0007_add_alcohol_preferences.sql` | ALTER TABLE ADD COLUMN | ✅ Безопасно |

## Тестовый сценарий

### Проверка сохранности данных при пересборке

1. **Создайте тестовые данные в базе:**
   ```bash
   docker-compose exec api node -e "
   const { db } = require('./dist/db/client.js');
   const { users } = require('./dist/db/schema.js');
   db.insert(users).values({
     id: 'test-user-123',
     email: 'test@example.com',
     name: 'Test User',
     role: 'user',
     tabNumber: 'TEST001',
     otpCode: '123456'
   }).run();
   console.log('Test user created');
   "
   ```

2. **Проверьте, что данные есть:**
   ```bash
   docker-compose exec api sqlite3 /app/data/evm.sqlite "SELECT * FROM users WHERE id = 'test-user-123';"
   ```

3. **Пересоберите контейнер:**
   ```bash
   docker-compose up -d --build api
   ```

4. **Проверьте, что данные сохранились:**
   ```bash
   docker-compose exec api sqlite3 /app/data/evm.sqlite "SELECT * FROM users WHERE id = 'test-user-123';"
   ```

5. **Проверьте таблицу миграций:**
   ```bash
   docker-compose exec api sqlite3 /app/data/evm.sqlite "SELECT * FROM __drizzle_migrations;"
   ```

### Проверка применения новых миграций

1. **Создайте новую миграцию:**
   ```bash
   cd api
   pnpm drizzle-kit generate:sqlite
   ```

2. **Проверьте содержимое миграции** - убедитесь, что используются только безопасные операции

3. **Примените миграцию:**
   ```bash
   docker-compose restart api
   ```

4. **Проверьте, что данные сохранились:**
   ```bash
   docker-compose exec api sqlite3 /app/data/evm.sqlite "SELECT COUNT(*) FROM users;"
   ```

## Важные замечания

### ⚠️ Что НЕ удаляет базу данных:
- ✅ `docker-compose up -d --build` - пересборка контейнера
- ✅ `docker-compose down` - остановка контейнеров (без `-v`)
- ✅ `docker-compose restart` - перезапуск контейнеров
- ✅ `docker system prune -f` - очистка неиспользуемых образов (без `--volumes`)

### ⚠️ Что УДАЛИТ базу данных:
- ❌ `docker-compose down -v` - остановка с удалением volumes
- ❌ `docker volume rm evm_api_data` - удаление volume вручную
- ❌ `docker system prune -f --volumes` - очистка с удалением volumes

## Логи миграций

При запуске контейнера миграции применяются автоматически. Если миграция уже применена, Drizzle пропустит её без ошибок.

Если вы видите ошибку миграции в логах, это может быть:
- Миграция уже применена (безопасно игнорировать)
- Конфликт схемы (требует внимания)

Проверьте логи:
```bash
docker-compose logs api | grep -i migration
```

## Резервное копирование

Рекомендуется регулярно создавать резервные копии базы данных:

```bash
# Создание backup
docker run --rm -v evm_api_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Восстановление из backup
docker run --rm -v evm_api_data:/data -v $(pwd):/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/db_backup_YYYYMMDD_HHMMSS.tar.gz"
```





