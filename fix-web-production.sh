#!/bin/bash

# Скрипт для исправления веб-портала на продакшене
# Использование: ./fix-web-production.sh [IP_ADDRESS]

set -e

SERVER_IP="${1:-207.154.207.198}"

echo "=========================================="
echo "  ИСПРАВЛЕНИЕ ВЕБ-ПОРТАЛА НА ПРОДАКШЕНЕ"
echo "=========================================="
echo ""
echo "Сервер: $SERVER_IP"
echo ""

# Сначала запускаем диагностику
echo "Запуск диагностики..."
./diagnose-web-production.sh "$SERVER_IP" || true
echo ""

read -p "Продолжить исправление? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 0
fi

echo ""
echo "=== ИСПРАВЛЕНИЕ ==="
echo ""

ssh root@$SERVER_IP bash << 'REMOTE_SCRIPT'
set -e

cd /root/evm || { echo "❌ Директория /root/evm не найдена"; exit 1; }

echo "1. Остановка web контейнера..."
docker-compose -f docker-compose.prod.yml stop web 2>/dev/null || docker compose -f docker-compose.prod.yml stop web 2>/dev/null || true
echo "✓ Остановлен"
echo ""

echo "2. Удаление web контейнера..."
docker-compose -f docker-compose.prod.yml rm -f web 2>/dev/null || docker compose -f docker-compose.prod.yml rm -f web 2>/dev/null || true
echo "✓ Удален"
echo ""

echo "3. Удаление старого образа web..."
docker rmi evm-web:latest 2>/dev/null || true
echo "✓ Удален"
echo ""

echo "4. Проверка .env файла..."
if [ -f /root/evm/.env ]; then
    echo "✓ .env файл найден"
    if ! grep -q "^NEXT_PUBLIC_API_URL=" /root/evm/.env; then
        echo "⚠️  NEXT_PUBLIC_API_URL не установлена в .env"
        echo "   Добавляю NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api"
        echo "NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api" >> /root/evm/.env
    else
        echo "✓ NEXT_PUBLIC_API_URL установлена"
        grep "^NEXT_PUBLIC_API_URL=" /root/evm/.env
    fi
else
    echo "⚠️  .env файл не найден, создаю..."
    cat > /root/evm/.env << 'ENVFILE'
NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api
WEB_PORT=3000
API_PORT=4000
ENVFILE
    echo "✓ .env файл создан"
fi
echo ""

echo "5. Проверка наличия собранного проекта..."
if [ ! -d web/.next/standalone ]; then
    echo "❌ web/.next/standalone не найден"
    echo "   Нужно пересобрать проект локально и задеплоить"
    echo "   Запустите: ./deploy.sh --web"
    exit 1
fi
echo "✓ Собранный проект найден"
echo ""

echo "6. Пересборка Docker образа..."
if docker-compose -f docker-compose.prod.yml build web 2>&1; then
    echo "✓ Образ успешно собран"
else
    echo "❌ Ошибка при сборке образа"
    echo ""
    echo "Попробуем через docker build:"
    if docker build -f web/Dockerfile.prod -t evm-web:latest . 2>&1; then
        echo "✓ Образ собран через docker build"
    else
        echo "❌ Ошибка при сборке через docker build"
        exit 1
    fi
fi
echo ""

echo "7. Запуск web контейнера..."
if docker-compose -f docker-compose.prod.yml up -d web 2>&1; then
    echo "✓ Контейнер запущен"
else
    echo "❌ Ошибка при запуске контейнера"
    exit 1
fi
echo ""

echo "8. Ожидание запуска (15 секунд)..."
sleep 15
echo ""

echo "9. Проверка статуса..."
if docker ps | grep -q evm-web; then
    echo "✓ Web контейнер запущен"
    docker ps | grep evm-web
else
    echo "❌ Web контейнер не запущен"
    echo ""
    echo "Логи контейнера:"
    docker logs evm-web --tail 50 2>&1
    exit 1
fi
echo ""

echo "10. Проверка доступности..."
sleep 5
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Web контейнер отвечает на HTTP запросы"
else
    echo "⚠️  Web контейнер пока не отвечает"
    echo "   Логи:"
    docker logs evm-web --tail 30 2>&1
    echo ""
    echo "   Попробуйте проверить через минуту: curl http://localhost:3000"
fi
echo ""

echo "11. Проверка nginx..."
if systemctl is-active --quiet nginx 2>/dev/null || service nginx status > /dev/null 2>&1; then
    echo "✓ Nginx запущен"
    echo "   Перезагрузка nginx..."
    nginx -t && systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
    echo "✓ Nginx перезагружен"
else
    echo "⚠️  Nginx не запущен"
fi
echo ""

echo "=== РЕЗЮМЕ ==="
echo ""
if docker ps | grep -q evm-web && curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Веб-портал успешно исправлен и работает!"
    echo ""
    echo "Проверьте сайт:"
    echo "  https://cyberelka2077.ru"
else
    echo "⚠️  Веб-портал запущен, но может быть еще не готов"
    echo ""
    echo "Проверьте логи:"
    echo "  docker logs evm-web --tail 100"
fi
echo ""

REMOTE_SCRIPT

echo ""
echo "Исправление завершено."


