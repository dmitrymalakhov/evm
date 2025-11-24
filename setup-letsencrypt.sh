#!/bin/bash

# Скрипт для автоматической настройки Let's Encrypt SSL сертификатов
# Использование: ./setup-letsencrypt.sh [IP_ADDRESS]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# IP адрес сервера
SERVER_IP="${1:-207.154.207.198}"

info "Начинаем настройку Let's Encrypt SSL сертификатов на сервере $SERVER_IP..."

# Проверка SSH подключения
info "Проверка SSH подключения..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new root@$SERVER_IP "echo 'SSH connection OK'" 2>/dev/null; then
    error "Не удалось подключиться к серверу. Проверьте SSH ключи и доступность сервера."
    exit 1
fi

# Создаем временную конфигурацию nginx без SSL для прохождения проверки Let's Encrypt
info "Создание временной конфигурации nginx для Let's Encrypt..."
cat > /tmp/nginx-letsencrypt.conf << 'NGINX_CONF'
# Nginx configuration for cyberelka2077.ru
# Temporary configuration for Let's Encrypt verification
server {
    listen 80;
    listen [::]:80;
    server_name cyberelka2077.ru www.cyberelka2077.ru;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary: proxy to web app (will be replaced by certbot)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location = /api {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static uploads
    location /uploads {
        proxy_pass http://127.0.0.1:4000;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        access_log off;
    }
}
NGINX_CONF

# Копируем временную конфигурацию на сервер
info "Копирование временной конфигурации nginx на сервер..."
scp -o StrictHostKeyChecking=accept-new /tmp/nginx-letsencrypt.conf root@$SERVER_IP:/tmp/nginx-letsencrypt.conf || {
    error "Не удалось скопировать конфигурацию."
    exit 1
}

# Выполнение команд на сервере
info "Настройка Let's Encrypt на сервере..."
ssh -o StrictHostKeyChecking=accept-new root@$SERVER_IP bash << 'REMOTE_SCRIPT'
set -e

echo "=== Установка certbot ==="
if ! command -v certbot &> /dev/null; then
    echo "Установка certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    echo "✓ certbot уже установлен"
fi

echo ""
echo "=== Создание директории для Let's Encrypt challenges ==="
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot 2>/dev/null || chown -R nginx:nginx /var/www/certbot 2>/dev/null || true

echo ""
echo "=== Установка временной конфигурации nginx ==="
cp /tmp/nginx-letsencrypt.conf /etc/nginx/sites-available/cyberelka2077.ru.conf
ln -sf /etc/nginx/sites-available/cyberelka2077.ru.conf /etc/nginx/sites-enabled/cyberelka2077.ru.conf
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "=== Проверка конфигурации nginx ==="
if nginx -t; then
    echo "✓ Конфигурация nginx валидна"
else
    echo "❌ Ошибка в конфигурации nginx"
    exit 1
fi

echo ""
echo "=== Перезапуск nginx ==="
systemctl restart nginx
echo "✓ nginx перезапущен"

echo ""
echo "=== Получение SSL сертификата от Let's Encrypt ==="
echo "Это может занять несколько минут..."
if certbot --nginx -d cyberelka2077.ru -d www.cyberelka2077.ru --non-interactive --agree-tos --email admin@cyberelka2077.ru --redirect; then
    echo "✓ SSL сертификат успешно получен и настроен"
else
    echo "❌ Ошибка при получении SSL сертификата"
    echo ""
    echo "Попробуйте запустить вручную:"
    echo "  certbot --nginx -d cyberelka2077.ru -d www.cyberelka2077.ru"
    exit 1
fi

echo ""
echo "=== Проверка статуса nginx ==="
if systemctl is-active --quiet nginx; then
    echo "✓ nginx работает"
else
    echo "❌ nginx не запущен"
    exit 1
fi

echo ""
echo "=== Проверка SSL сертификата ==="
if [ -f /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem ]; then
    echo "✓ Сертификат найден: /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem"
    CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "  Срок действия: $CERT_EXPIRY"
else
    echo "⚠️  Сертификат не найден"
fi

echo ""
echo "=== Настройка автообновления сертификата ==="
# Проверяем, есть ли уже cron job для обновления
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    # Добавляем задачу на обновление сертификата (каждый день в 3:00)
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo "✓ Автообновление сертификата настроено (каждый день в 3:00)"
else
    echo "✓ Автообновление сертификата уже настроено"
fi

echo ""
echo "=== Проверка доступности портов ==="
if netstat -tuln 2>/dev/null | grep -q ":443 " || ss -tuln 2>/dev/null | grep -q ":443 "; then
    echo "✓ Порт 443 (HTTPS) слушается"
else
    echo "⚠️  Порт 443 не слушается"
fi

echo ""
echo "=== Настройка завершена ==="
echo ""
echo "Проверьте сайт:"
echo "  https://cyberelka2077.ru"
echo ""
echo "Сертификат будет автоматически обновляться каждые 90 дней."
REMOTE_SCRIPT

if [ $? -eq 0 ]; then
    info ""
    info "✅ Настройка Let's Encrypt завершена успешно!"
    info ""
    info "Сайт доступен по адресу:"
    info "  https://cyberelka2077.ru"
    info ""
    info "Сертификат будет автоматически обновляться каждые 90 дней."
else
    error "Ошибка при настройке Let's Encrypt на сервере"
    exit 1
fi

# Удаляем временный файл
rm -f /tmp/nginx-letsencrypt.conf

