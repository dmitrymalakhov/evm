# Инструкция по деплою на сервер

## Предварительные требования

1. **SSH доступ к серверу** (207.154.207.198)
2. **Docker и Docker Compose** установлены на сервере
3. **SSL сертификаты** в папке `cert/`:
   - `private_key.txt` или `privkey.pem` - приватный ключ (уже есть)
   - `certificate.crt` или `certificate.pem` - сертификат
   - `chain.pem` или `chain.crt` - цепочка сертификатов (опционально)
   - Или `fullchain.pem` - полная цепочка (альтернатива)

## Структура сертификатов

Для работы SSL нужны следующие файлы в папке `cert/`:

```
cert/
├── private_key.txt (или privkey.pem) - приватный ключ ✓
├── certificate.crt (или certificate.pem) - сертификат
└── chain.pem (или chain.crt) - цепочка сертификатов (опционально)
```

Или можно использовать:
```
cert/
├── private_key.txt (или privkey.pem) - приватный ключ ✓
└── fullchain.pem - полная цепочка сертификатов
```

## Быстрый деплой

### 1. Подготовка сертификатов

Убедитесь, что в папке `cert/` есть все необходимые файлы:
- Приватный ключ (уже есть: `private_key.txt`)
- Сертификат (`certificate.crt` или `certificate.pem`)
- Цепочка (опционально, если не используется `fullchain.pem`)

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта (если еще не создан):

```env
# API Configuration
API_PORT=4000
API_BASE_URL=http://api:4000

# Web Configuration
WEB_PORT=3000
NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api

# CORS Configuration
CORS_ORIGIN=https://cyberelka2077.ru

# Telegram Bot Configuration
BOT_TOKEN=8590310304:AAGoQkWA8YwXaFLVEBvumiqnhnaluH_l4ho
```

**Важно:** 
- `NEXT_PUBLIC_API_URL` должен указывать на публичный URL API (через nginx)
- `CORS_ORIGIN` должен быть установлен на домен сайта

#### Автоматизация ввода пароля от сертификата

Если ваш приватный ключ зашифрован паролем, вы можете использовать один из следующих способов:

**Вариант 1: Файл `.cert_password` (рекомендуется, уже настроен)**
Скрипт автоматически загрузит пароль из файла `.cert_password` в корне проекта, если он существует.
Файл уже создан и добавлен в `.gitignore`, поэтому он не будет закоммичен в git.

**Вариант 2: Переменная окружения**
```bash
export CERT_PASSWORD="ваш_пароль"
./deploy.sh 207.154.207.198
```

**Вариант 3: Передать в команде**
```bash
CERT_PASSWORD="ваш_пароль" ./deploy.sh 207.154.207.198
```

**Вариант 4: Добавить в `.bashrc` или `.zshrc`**
```bash
echo 'export CERT_PASSWORD="ваш_пароль"' >> ~/.bashrc
source ~/.bashrc
```

Если ни один из способов не используется, скрипт запросит пароль один раз при первом использовании.

### 3. Запуск деплоя

```bash
./deploy.sh 207.154.207.198
```

Или с указанием пользователя:

```bash
./deploy.sh 207.154.207.198 root
```

Скрипт автоматически:
1. ✅ Проверит SSH подключение
2. ✅ Проверит наличие Docker на сервере
3. ✅ Обновит код из Git репозитория
4. ✅ Загрузит `.env` файл
5. ✅ Загрузит SSL сертификаты
6. ✅ Загрузит конфигурацию nginx
7. ✅ Соберет и запустит Docker контейнеры
8. ✅ Настроит nginx с SSL

## Что делает скрипт деплоя

### Этапы деплоя:

1. **Проверка подключения** - проверяет доступность сервера по SSH
2. **Проверка Docker** - убеждается, что Docker установлен
3. **Обновление кода** - клонирует или обновляет репозиторий Git
4. **Загрузка файлов**:
   - `.env` файл с переменными окружения
   - SSL сертификаты из папки `cert/`
   - Конфигурация nginx
   - Скрипт настройки nginx
5. **Сборка контейнеров** - собирает и запускает Docker контейнеры
6. **Настройка nginx** - устанавливает и настраивает nginx с SSL

## Настройка nginx

Скрипт `setup-nginx.sh` автоматически:
- Устанавливает nginx (если не установлен)
- Копирует SSL сертификаты в `/etc/nginx/ssl/cyberelka2077.ru/`
- Копирует конфигурацию nginx
- Проверяет конфигурацию
- Перезапускает nginx

### Ручная настройка nginx (если автоматическая не сработала)

```bash
ssh root@207.154.207.198
cd /opt/evm
sudo ./scripts/setup-nginx.sh
```

## Проверка после деплоя

### 1. Проверка контейнеров

```bash
ssh root@207.154.207.198 "cd /opt/evm && docker-compose ps"
```

Все контейнеры должны быть в статусе `Up`.

### 2. Проверка логов

```bash
# Все сервисы
ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs -f"

# Конкретный сервис
ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs -f api"
ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs -f web"
ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs -f telegram-bot"
```

### 3. Проверка доступности

```bash
# Локально на сервере
curl http://localhost:3000
curl http://localhost:4000/health

# Через домен (если DNS настроен)
curl https://cyberelka2077.ru
curl https://cyberelka2077.ru/api/health
```

### 4. Проверка nginx

```bash
ssh root@207.154.207.198 "systemctl status nginx"
ssh root@207.154.207.198 "nginx -t"
```

## Настройка DNS

Убедитесь, что DNS записи настроены правильно:

```
A запись: cyberelka2077.ru -> 207.154.207.198
A запись: www.cyberelka2077.ru -> 207.154.207.198
```

Проверить можно командой:

```bash
dig cyberelka2077.ru
nslookup cyberelka2077.ru
```

## Обновление приложения

Для обновления приложения просто запустите скрипт деплоя снова:

```bash
./deploy.sh 207.154.207.198
```

Скрипт автоматически:
- Обновит код из Git
- Пересоберет контейнеры
- Перезапустит сервисы
- **База данных сохранится** (volumes не удаляются)

## Решение проблем

### Проблема: SSL сертификат не работает

1. Проверьте наличие всех файлов сертификатов:
   ```bash
   ssh root@207.154.207.198 "ls -la /opt/evm/cert/"
   ```

2. Проверьте, что сертификаты скопированы в nginx:
   ```bash
   ssh root@207.154.207.198 "ls -la /etc/nginx/ssl/cyberelka2077.ru/"
   ```

3. Проверьте логи nginx:
   ```bash
   ssh root@207.154.207.198 "tail -f /var/log/nginx/cyberelka2077.ru.error.log"
   ```

4. Проверьте конфигурацию nginx:
   ```bash
   ssh root@207.154.207.198 "nginx -t"
   ```

### Проблема: Контейнеры не запускаются

1. Проверьте логи:
   ```bash
   ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs"
   ```

2. Проверьте `.env` файл:
   ```bash
   ssh root@207.154.207.198 "cat /opt/evm/.env"
   ```

3. Проверьте, что порты не заняты:
   ```bash
   ssh root@207.154.207.198 "netstat -tuln | grep -E '3000|4000'"
   ```

### Проблема: nginx не запускается

1. Проверьте конфигурацию:
   ```bash
   ssh root@207.154.207.198 "nginx -t"
   ```

2. Проверьте логи:
   ```bash
   ssh root@207.154.207.198 "journalctl -u nginx -n 50"
   ```

3. Проверьте права доступа к сертификатам:
   ```bash
   ssh root@207.154.207.198 "ls -la /etc/nginx/ssl/cyberelka2077.ru/"
   ```

### Проблема: Сайт не открывается

1. Проверьте, что DNS настроен правильно
2. Проверьте, что порты открыты в firewall:
   ```bash
   ssh root@207.154.207.198 "ufw status"
   # Или для iptables
   ssh root@207.154.207.198 "iptables -L -n"
   ```

3. Убедитесь, что порты 80 и 443 открыты:
   ```bash
   # Для ufw
   ssh root@207.154.207.198 "ufw allow 80/tcp && ufw allow 443/tcp"
   ```

## Полезные команды

### Управление контейнерами

```bash
# Перезапуск всех сервисов
ssh root@207.154.207.198 "cd /opt/evm && docker-compose restart"

# Остановка сервисов (база данных сохранится)
ssh root@207.154.207.198 "cd /opt/evm && docker-compose down"

# Просмотр статуса
ssh root@207.154.207.198 "cd /opt/evm && docker-compose ps"
```

### Управление nginx

```bash
# Перезапуск nginx
ssh root@207.154.207.198 "systemctl restart nginx"

# Проверка статуса
ssh root@207.154.207.198 "systemctl status nginx"

# Просмотр логов
ssh root@207.154.207.198 "tail -f /var/log/nginx/cyberelka2077.ru.error.log"
```

### Резервное копирование

```bash
# Создать backup базы данных
ssh root@207.154.207.198 "cd /opt/evm && docker run --rm -v evm_api_data:/data -v \$(pwd):/backup alpine tar czf /backup/api_data_backup_\$(date +%Y%m%d).tar.gz -C /data ."
```

## Безопасность

1. **Не храните `.env` файл в Git** - он уже в `.gitignore`
2. **Защитите приватный ключ** - права доступа должны быть 600
3. **Регулярно обновляйте сертификаты** - следите за сроком действия
4. **Используйте firewall** - откройте только необходимые порты (22, 80, 443)
5. **Регулярно обновляйте систему** - `apt update && apt upgrade`

## Контакты и поддержка

При возникновении проблем проверьте:
1. Логи контейнеров
2. Логи nginx
3. Статус сервисов
4. Настройки DNS и firewall

