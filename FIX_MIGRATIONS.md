# Быстрое решение проблемы с миграциями

## Проблема
Ошибка при входе: `no such column: "will_drink_alcohol"`

## Решение

### Вариант 1: Автоматическое применение (рекомендуется)

Миграции применятся автоматически при перезапуске API контейнера:

```bash
ssh root@207.154.207.198 "cd /opt/evm && docker-compose restart api"
```

Проверьте логи, чтобы убедиться, что миграции применились:

```bash
ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs api | grep -i migration"
```

### Вариант 2: Ручное применение

Если автоматическое применение не сработало:

```bash
ssh root@207.154.207.198
cd /opt/evm/api
pnpm db:migrate
```

Или через Docker:

```bash
ssh root@207.154.207.198 "cd /opt/evm && docker exec -it evm-api-1 pnpm db:migrate"
```

### Вариант 3: Через SQL напрямую (если ничего не помогает)

```bash
ssh root@207.154.207.198
cd /opt/evm/api
sqlite3 sqlite/evm.sqlite <<EOF
ALTER TABLE users ADD COLUMN will_drink_alcohol integer;
ALTER TABLE users ADD COLUMN alcohol_preference text;
ALTER TABLE users ADD COLUMN grade integer;
ALTER TABLE users ADD COLUMN has_paid integer;
EOF
```

## Что было исправлено

1. ✅ Обновлен файл `api/drizzle/meta/_journal.json` - добавлены все миграции (0005-0008)
2. ✅ Создан скрипт для ручного применения миграций
3. ✅ Добавлена команда `pnpm db:migrate` в package.json

## Проверка

После применения миграций проверьте, что колонки добавлены:

```bash
ssh root@207.154.207.198
cd /opt/evm/api
sqlite3 sqlite/evm.sqlite ".schema users" | grep -E "will_drink_alcohol|alcohol_preference|grade|has_paid"
```

Должны быть видны все 4 колонки.


