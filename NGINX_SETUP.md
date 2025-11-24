# Настройка Nginx для веб-портала

## Быстрая настройка

### 1. Скопируйте конфигурацию nginx на сервер

```bash
# С локальной машины
scp nginx/cyberelka2077.ru.conf root@207.154.207.198:/root/evm/nginx/cyberelka2077.ru.conf
```

### 2. На сервере выполните настройку

```bash
ssh root@207.154.207.198

# Установите nginx (если не установлен)
apt-get update
apt-get install -y nginx

# Скопируйте конфигурацию
cp /root/evm/nginx/cyberelka2077.ru.conf /etc/nginx/sites-available/cyberelka2077.ru.conf

# Создайте символическую ссылку
ln -sf /etc/nginx/sites-available/cyberelka2077.ru.conf /etc/nginx/sites-enabled/cyberelka2077.ru.conf

# Удалите дефолтную конфигурацию (если есть)
rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Если конфигурация валидна, перезапустите nginx
systemctl restart nginx

# Проверьте статус
systemctl status nginx
```

### 3. Настройте SSL сертификаты

У вас есть два варианта:

#### Вариант A: Использовать Let's Encrypt (рекомендуется)

```bash
# Установите certbot
apt-get install -y certbot python3-certbot-nginx

# Получите сертификат
certbot --nginx -d cyberelka2077.ru -d www.cyberelka2077.ru

# Certbot автоматически обновит конфигурацию nginx
```

#### Вариант B: Использовать существующие сертификаты

Если у вас уже есть SSL сертификаты:

```bash
# Создайте директорию для сертификатов
mkdir -p /etc/nginx/ssl/cyberelka2077.ru

# Скопируйте сертификаты
# fullchain.pem - полная цепочка сертификатов
# privkey.pem - приватный ключ
cp /path/to/your/fullchain.pem /etc/nginx/ssl/cyberelka2077.ru/fullchain.pem
cp /path/to/your/privkey.pem /etc/nginx/ssl/cyberelka2077.ru/privkey.pem

# Установите правильные права
chmod 644 /etc/nginx/ssl/cyberelka2077.ru/fullchain.pem
chmod 600 /etc/nginx/ssl/cyberelka2077.ru/privkey.pem
```

### 4. Проверьте, что Docker контейнеры запущены

```bash
cd /root/evm
docker-compose -f docker-compose.prod.yml ps
```

Убедитесь, что:
- `evm-api` работает на порту 4000
- `evm-web` работает на порту 3000

### 5. Проверьте доступность

```bash
# Проверьте локально на сервере
curl http://127.0.0.1:3000
curl http://127.0.0.1:4000/health

# Проверьте через nginx
curl http://localhost
curl https://cyberelka2077.ru
```

## Структура конфигурации

Конфигурация nginx настроена следующим образом:

- **`/`** → проксируется на `http://127.0.0.1:3000` (Next.js веб-приложение)
- **`/api`** → проксируется на `http://127.0.0.1:4000` (API, префикс `/api` удаляется)
- **`/uploads`** → проксируется на `http://127.0.0.1:4000` (статические файлы из API)
- **`/health`** → проксируется на `http://127.0.0.1:4000/health` (health check)

## Важные настройки

### Переменные окружения

Убедитесь, что в `.env` файле на сервере правильно настроены:

```bash
# В /root/evm/.env
NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api
CORS_ORIGIN=https://cyberelka2077.ru
```

### Проверка логов

```bash
# Логи nginx
tail -f /var/log/nginx/cyberelka2077.ru.access.log
tail -f /var/log/nginx/cyberelka2077.ru.error.log

# Логи Docker контейнеров
cd /root/evm
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f api
```

## Устранение проблем

### Nginx не запускается

```bash
# Проверьте конфигурацию
nginx -t

# Проверьте, не заняты ли порты
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Проверьте логи
journalctl -u nginx -n 50
```

### Контейнеры недоступны

```bash
# Проверьте, что контейнеры запущены
docker ps

# Проверьте, что порты проброшены
docker port evm-api
docker port evm-web

# Проверьте доступность изнутри контейнера
docker exec evm-api wget -O- http://localhost:4000/health
docker exec evm-web wget -O- http://localhost:3000
```

### SSL сертификат не работает

```bash
# Проверьте сертификат
openssl x509 -in /etc/nginx/ssl/cyberelka2077.ru/fullchain.pem -text -noout

# Проверьте права доступа
ls -la /etc/nginx/ssl/cyberelka2077.ru/
```

## Автоматическое обновление SSL (Let's Encrypt)

Если используете Let's Encrypt, настройте автоматическое обновление:

```bash
# Проверьте, что cron задание создано
certbot renew --dry-run

# Или добавьте в crontab
echo "0 0 * * * certbot renew --quiet" | crontab -
```

## Полезные команды

```bash
# Перезапуск nginx
systemctl restart nginx

# Перезагрузка конфигурации без остановки
nginx -s reload

# Проверка статуса
systemctl status nginx

# Просмотр активных конфигураций
ls -la /etc/nginx/sites-enabled/
```

