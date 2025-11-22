# Docker Deployment Guide

Этот проект подготовлен к развертыванию в Docker контейнерах. Все сервисы (API, Web, Telegram Bot) можно запустить с помощью Docker Compose.

## Предварительные требования

- Docker (версия 20.10 или выше)
- Docker Compose (версия 2.0 или выше)

## Быстрый старт

1. **Клонируйте репозиторий** (если еще не сделано):
   ```bash
   git clone <repository-url>
   cd evm
   ```

2. **Создайте файл `.env`** в корне проекта на основе `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. **Настройте переменные окружения** в файле `.env`:
   ```env
   # API Configuration
   API_PORT=4000
   API_BASE_URL=http://api:4000

   # Web Configuration
   WEB_PORT=3000
   NEXT_PUBLIC_API_URL=http://localhost:4000  # URL для доступа из браузера

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # Telegram Bot Configuration
   BOT_TOKEN=your_telegram_bot_token_here  # Получите у @BotFather в Telegram
   ```

4. **Соберите и запустите все сервисы**:
   ```bash
   docker-compose up -d --build
   ```

5. **Проверьте статус контейнеров**:
   ```bash
   docker-compose ps
   ```

6. **Просмотрите логи** (если нужно):
   ```bash
   docker-compose logs -f
   ```

## Доступ к сервисам

После запуска сервисы будут доступны по следующим адресам:

- **Web приложение**: http://localhost:3000
- **API**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health

## Управление контейнерами

### Остановка сервисов
```bash
docker-compose stop
```

### Остановка и удаление контейнеров
```bash
docker-compose down
```

**⚠️ ВАЖНО:** Команда `docker-compose down` **НЕ удаляет volumes** по умолчанию, поэтому база данных и загруженные файлы сохраняются. 

Если нужно удалить volumes (и базу данных), используйте:
```bash
docker-compose down -v  # ⚠️ Это удалит базу данных!
```

### Перезапуск сервисов
```bash
docker-compose restart
```

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f telegram-bot
```

### Выполнение команд в контейнере
```bash
# API контейнер
docker-compose exec api sh

# Web контейнер
docker-compose exec web sh

# Telegram Bot контейнер
docker-compose exec telegram-bot sh
```

## Структура сервисов

### API (api/)
- **Порт**: 4000
- **База данных**: SQLite (монтируется как volume `api_data`)
- **Загрузки**: Директория `uploads` (монтируется как volume `api_uploads`)
- **Health Check**: `/health` endpoint

### Web (web/)
- **Порт**: 3000
- **Технология**: Next.js 16
- **Сборка**: Standalone mode для оптимизации размера образа

### Telegram Bot (telegram-bot/)
- **Требует**: `BOT_TOKEN` переменную окружения
- **Зависит от**: API сервиса

## Персистентные данные

Данные сохраняются в Docker volumes:

- `api_data` - база данных SQLite
- `api_uploads` - загруженные файлы

Для резервного копирования:
```bash
# Создать backup volumes
docker run --rm -v evm_api_data:/data -v $(pwd):/backup alpine tar czf /backup/api_data_backup.tar.gz -C /data .
docker run --rm -v evm_api_uploads:/data -v $(pwd):/backup alpine tar czf /backup/api_uploads_backup.tar.gz -C /data .
```

Для восстановления:
```bash
# Восстановить backup volumes
docker run --rm -v evm_api_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/api_data_backup.tar.gz"
docker run --rm -v evm_api_uploads:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/api_uploads_backup.tar.gz"
```

## Переменные окружения

### API
- `PORT` - порт для API (по умолчанию: 4000)
- `HOST` - хост для API (по умолчанию: 0.0.0.0)
- `SQLITE_PATH` - путь к файлу SQLite базы данных
- `DRIZZLE_MIGRATE` - автоматически запускать миграции при старте (по умолчанию: true)
- `CORS_ORIGIN` - разрешенные источники для CORS

### Web
- `PORT` - порт для Web приложения (по умолчанию: 3000)
- `HOSTNAME` - хост для Web приложения (по умолчанию: 0.0.0.0)
- `NEXT_PUBLIC_API_URL` - URL API для подключения из браузера

### Telegram Bot
- `BOT_TOKEN` - токен Telegram бота (обязательно)
- `API_BASE_URL` - URL API сервера (по умолчанию: http://api:4000)
- `API_TIMEOUT` - таймаут запросов к API в миллисекундах (по умолчанию: 10000)
- `API_RETRY_ATTEMPTS` - количество попыток повтора запросов (по умолчанию: 3)
- `API_RETRY_DELAY` - задержка между попытками в миллисекундах (по умолчанию: 1000)

## Развертывание в продакшене

### Рекомендации для продакшена:

1. **Используйте reverse proxy** (nginx/traefik) для HTTPS и маршрутизации
2. **Настройте SSL/TLS сертификаты** через Let's Encrypt
3. **Используйте секреты Docker** для чувствительных данных вместо `.env` файла
4. **Настройте мониторинг** (Prometheus, Grafana)
5. **Настройте логирование** в централизованную систему
6. **Регулярно делайте бэкапы** базы данных и uploads
7. **Обновите `CORS_ORIGIN`** на реальный домен
8. **Настройте `NEXT_PUBLIC_API_URL`** на публичный URL API

### Пример конфигурации nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Обновление приложения

1. Получите последние изменения:
   ```bash
   git pull
   ```

2. Пересоберите и перезапустите контейнеры:
   ```bash
   docker-compose up -d --build
   ```
   
   **✅ База данных сохраняется:** При пересборке контейнеров volumes не удаляются, поэтому все данные в базе остаются нетронутыми.

3. Проверьте логи на наличие ошибок:
   ```bash
   docker-compose logs -f
   ```

## Решение проблем

### Контейнер не запускается
- Проверьте логи: `docker-compose logs <service-name>`
- Убедитесь, что все переменные окружения установлены
- Проверьте, что порты не заняты другими процессами

### API не отвечает
- Проверьте health check: `curl http://localhost:4000/health`
- Проверьте логи API: `docker-compose logs api`
- Убедитесь, что база данных доступна и миграции выполнены

### Web не подключается к API
- Проверьте переменную `NEXT_PUBLIC_API_URL` в `.env`
- Убедитесь, что API запущен и доступен
- Проверьте CORS настройки в API

### Telegram Bot не работает
- Проверьте, что `BOT_TOKEN` установлен и корректный
- Проверьте логи бота: `docker-compose logs telegram-bot`
- Убедитесь, что API доступен из контейнера бота

### Проблемы с базой данных
- База данных находится в volume `api_data` (или `evm_api_data` с префиксом проекта)
- **База данных сохраняется** при пересборке контейнеров благодаря volume
- Для проверки содержимого volume: `docker run --rm -v evm_api_data:/data alpine ls -la /data`
- Для очистки базы данных: `docker volume rm evm_api_data` ⚠️ **Это удалит все данные!**
- Для проверки существующих volumes: `docker volume ls | grep evm`

## Автоматический деплой на удаленный сервер

Для упрощения процесса деплоя на удаленный сервер используется скрипт `deploy.sh`.

### Предварительные требования

1. **SSH доступ к серверу** с правами для выполнения Docker команд
2. **Docker и Docker Compose** установлены на удаленном сервере
3. **Git репозиторий** должен быть доступен с сервера (или указан URL при первом запуске)

### Использование скрипта деплоя

Базовое использование (только IP адрес):
```bash
./deploy.sh 192.168.1.100
```

С указанием пользователя:
```bash
./deploy.sh 192.168.1.100 ubuntu
```

С указанием всех параметров:
```bash
./deploy.sh 192.168.1.100 ubuntu 22 /opt/evm main
```

С автоматическим клонированием репозитория:
```bash
./deploy.sh 192.168.1.100 root 22 /opt/evm main https://github.com/user/repo.git
```

### Параметры скрипта

1. **server_ip** (обязательно) - IP адрес или домен удаленного сервера
2. **user** (опционально, по умолчанию: `root`) - Пользователь для SSH подключения
3. **ssh_port** (опционально, по умолчанию: `22`) - Порт SSH
4. **remote_path** (опционально, по умолчанию: `/opt/evm`) - Путь на сервере для деплоя
5. **git_branch** (опционально, по умолчанию: `main`) - Ветка Git для деплоя
6. **git_repo_url** (опционально) - URL репозитория для автоматического клонирования

### Что делает скрипт

1. ✅ Проверяет SSH подключение к серверу
2. ✅ Проверяет наличие Docker и Docker Compose на сервере
3. ✅ Создает директорию для деплоя (если не существует)
4. ✅ Клонирует или обновляет репозиторий Git
5. ✅ Копирует `.env` файл на сервер (если существует локально)
6. ✅ Останавливает существующие контейнеры
7. ✅ Собирает и запускает новые контейнеры
8. ✅ Проверяет статус контейнеров и health checks

### Первый запуск

При первом запуске на новом сервере:

1. **Убедитесь, что Docker установлен:**
   ```bash
   ssh user@server_ip "docker --version && docker-compose --version"
   ```

2. **Клонируйте репозиторий вручную или укажите URL:**
   ```bash
   # Вручную
   ssh user@server_ip
   cd /opt
   git clone <repository-url> evm
   cd evm
   
   # Или используйте скрипт с URL репозитория
   ./deploy.sh server_ip user 22 /opt/evm main https://github.com/user/repo.git
   ```

3. **Создайте `.env` файл на сервере** (или скопируйте локальный):
   ```bash
   scp .env user@server_ip:/opt/evm/.env
   ```

4. **Запустите деплой:**
   ```bash
   ./deploy.sh server_ip user
   ```

### Настройка SSH ключей

Для удобства рекомендуется настроить SSH ключи:

```bash
# Генерация ключа (если еще нет)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Копирование ключа на сервер
ssh-copy-id -p 22 user@server_ip

# Теперь можно подключаться без пароля
```

### Обновление приложения

Для обновления приложения просто запустите скрипт снова:

```bash
./deploy.sh 192.168.1.100
```

Скрипт автоматически:
- Обновит код из Git репозитория
- Пересоберет контейнеры
- Перезапустит сервисы

### Мониторинг после деплоя

После деплоя проверьте логи:

```bash
# Все сервисы
ssh user@server_ip "cd /opt/evm && docker-compose logs -f"

# Конкретный сервис
ssh user@server_ip "cd /opt/evm && docker-compose logs -f api"
```

Проверьте доступность сервисов:

```bash
# API Health Check
curl http://server_ip:4000/health

# Web приложение
curl http://server_ip:3000
```

### Решение проблем при деплое

**Проблема: SSH подключение не работает**
- Проверьте доступность сервера: `ping server_ip`
- Проверьте SSH сервис: `ssh -v user@server_ip`
- Убедитесь, что порт SSH правильный

**Проблема: Docker не установлен на сервере**
- Установите Docker: https://docs.docker.com/get-docker/
- Убедитесь, что пользователь в группе `docker`: `sudo usermod -aG docker $USER`

**Проблема: Репозиторий не клонируется**
- Проверьте доступность Git репозитория с сервера
- Убедитесь, что SSH ключи настроены для Git (если используется SSH URL)
- Попробуйте использовать HTTPS URL репозитория

**Проблема: Контейнеры не запускаются**
- Проверьте логи: `ssh user@server_ip "cd /opt/evm && docker-compose logs"`
- Убедитесь, что `.env` файл настроен правильно
- Проверьте, что порты не заняты: `ssh user@server_ip "netstat -tuln | grep -E '3000|4000'"`

## Дополнительная информация

- Документация Docker: https://docs.docker.com/
- Документация Docker Compose: https://docs.docker.com/compose/
- Next.js Docker: https://nextjs.org/docs/deployment#docker-image

