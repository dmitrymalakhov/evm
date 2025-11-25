# Деплой без Docker

Этот скрипт деплоя запускает проект напрямую на сервере без использования Docker контейнеров, используя PM2 для управления процессами.

## Требования на сервере

- **Node.js** (версия 20+)
- **pnpm** (установится автоматически, если отсутствует)
- **PM2** (установится автоматически, если отсутствует)

## Подготовка

### 1. Создайте файл `.env` в корне проекта

```env
# API Configuration
API_PORT=4000
PORT=4000
HOST=0.0.0.0
SQLITE_PATH=/root/evm/api/sqlite/evm.sqlite
DRIZZLE_MIGRATE=true
CORS_ORIGIN=https://cyberelka2077.ru

# Web Configuration
WEB_PORT=3000
NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api

# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
API_BASE_URL=http://localhost:4000
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=1000
```

## Использование

### Базовый деплой всех сервисов

```bash
./deploy.sh --api --web --telegram-bot
```

### Деплой отдельных сервисов

```bash
# Только API
./deploy.sh --api

# Только Web
./deploy.sh --web

# Только Telegram Bot
./deploy.sh --telegram-bot

# Комбинация
./deploy.sh --api --web
```

### Деплой на другой сервер

```bash
./deploy.sh --api --web --telegram-bot --ip 192.168.1.100
```

## Что делает скрипт

1. ✅ Собирает исходники проекта в архив
2. ✅ Копирует архив на сервер
3. ✅ Проверяет наличие Node.js, pnpm и PM2 (устанавливает при необходимости)
4. ✅ Распаковывает архив в `/root/evm`
5. ✅ Загружает `.env` файл (если существует)
6. ✅ Устанавливает зависимости через `pnpm install`
7. ✅ Собирает проекты (`pnpm build`)
8. ✅ Останавливает старые процессы PM2
9. ✅ Запускает новые процессы через PM2
10. ✅ Сохраняет конфигурацию PM2 для автозапуска

## Структура на сервере

```
/root/evm/
├── api/
│   ├── src/          # Исходники
│   ├── dist/         # Собранные файлы
│   ├── sqlite/       # База данных SQLite
│   ├── uploads/      # Загруженные файлы
│   └── package.json
├── web/
│   ├── src/          # Исходники
│   ├── .next/        # Собранное Next.js приложение
│   └── package.json
├── telegram-bot/
│   ├── src/          # Исходники
│   ├── dist/         # Собранные файлы
│   └── package.json
├── ecosystem.config.js  # Конфигурация PM2
├── .env              # Переменные окружения
└── logs/             # Логи PM2
```

## Управление процессами на сервере

### Просмотр статуса

```bash
ssh root@207.154.207.198 "pm2 status"
```

### Просмотр логов

```bash
# Все процессы
ssh root@207.154.207.198 "pm2 logs"

# Конкретный процесс
ssh root@207.154.207.198 "pm2 logs evm-api"
ssh root@207.154.207.198 "pm2 logs evm-web"
ssh root@207.154.207.198 "pm2 logs evm-telegram-bot"
```

### Перезапуск процессов

```bash
# Все процессы
ssh root@207.154.207.198 "pm2 restart all"

# Конкретный процесс
ssh root@207.154.207.198 "pm2 restart evm-api"
```

### Остановка процессов

```bash
# Все процессы
ssh root@207.154.207.198 "pm2 stop all"

# Конкретный процесс
ssh root@207.154.207.198 "pm2 stop evm-api"
```

### Удаление процессов

```bash
# Все процессы
ssh root@207.154.207.198 "pm2 delete all"

# Конкретный процесс
ssh root@207.154.207.198 "pm2 delete evm-api"
```

## Обновление переменных окружения

1. Отредактируйте `.env` файл локально
2. Запустите деплой снова - скрипт автоматически загрузит обновленный `.env`
3. Или загрузите вручную:

```bash
scp .env root@207.154.207.198:/root/evm/.env
ssh root@207.154.207.198 "cd /root/evm && pm2 reload ecosystem.config.js --update-env"
```

## Проверка работы

### Проверка API

```bash
curl http://localhost:4000/health
# или
curl https://cyberelka2077.ru/api/health
```

### Проверка Web

```bash
curl http://localhost:3000
# или
curl https://cyberelka2077.ru
```

### Проверка процессов

```bash
ssh root@207.154.207.198 "pm2 status"
```

Все процессы должны быть в статусе `online`.

## Решение проблем

### Проблема: Процессы не запускаются

1. Проверьте логи:
   ```bash
   ssh root@207.154.207.198 "pm2 logs"
   ```

2. Проверьте, что порты не заняты:
   ```bash
   ssh root@207.154.207.198 "netstat -tuln | grep -E '3000|4000'"
   ```

3. Проверьте переменные окружения:
   ```bash
   ssh root@207.154.207.198 "cat /root/evm/.env"
   ```

### Проблема: Зависимости не устанавливаются

1. Проверьте версию Node.js:
   ```bash
   ssh root@207.154.207.198 "node --version"
   ```

2. Проверьте версию pnpm:
   ```bash
   ssh root@207.154.207.198 "pnpm --version"
   ```

3. Попробуйте установить зависимости вручную:
   ```bash
   ssh root@207.154.207.198 "cd /root/evm/api && pnpm install"
   ```

### Проблема: База данных не создается

1. Проверьте права доступа:
   ```bash
   ssh root@207.154.207.198 "ls -la /root/evm/api/sqlite/"
   ```

2. Создайте директорию вручную:
   ```bash
   ssh root@207.154.207.198 "mkdir -p /root/evm/api/sqlite && chmod 755 /root/evm/api/sqlite"
   ```

## Миграция с Docker

Если вы ранее использовали Docker:

1. Остановите Docker контейнеры:
   ```bash
   ssh root@207.154.207.198 "cd /root/evm && docker-compose down"
   ```

2. Скопируйте базу данных (если нужно):
   ```bash
   # База данных находится в Docker volume, нужно скопировать
   ssh root@207.154.207.198 "docker run --rm -v evm_api_data:/data -v /root/evm/api/sqlite:/backup alpine sh -c 'cp -r /data/* /backup/'"
   ```

3. Запустите новый деплой:
   ```bash
   ./deploy.sh --api --web --telegram-bot
   ```

## Автозапуск при перезагрузке сервера

PM2 автоматически настроит автозапуск при первом сохранении конфигурации (`pm2 save`). Это уже делается автоматически в скрипте деплоя.

Для проверки:
```bash
ssh root@207.154.207.198 "pm2 startup"
```


