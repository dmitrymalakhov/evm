#!/bin/bash

# Скрипт для быстрого исправления web контейнера
# Пересобирает и перезапускает web контейнер

set -e

echo "=== Исправление web контейнера ==="
echo ""

# Проверка, что мы в правильной директории
if [ ! -f "deploy.sh" ]; then
    echo "Ошибка: запустите скрипт из корня проекта"
    exit 1
fi

echo "1. Остановка старого web контейнера на сервере..."
ssh root@207.154.207.198 "cd /root/evm && docker-compose -f docker-compose.prod.yml stop web 2>/dev/null || docker compose -f docker-compose.prod.yml stop web 2>/dev/null || true"

echo ""
echo "2. Удаление старого web контейнера и образа на сервере..."
ssh root@207.154.207.198 "cd /root/evm && docker-compose -f docker-compose.prod.yml rm -f web 2>/dev/null || docker compose -f docker-compose.prod.yml rm -f web 2>/dev/null || true"
ssh root@207.154.207.198 "docker rmi evm-web:latest 2>/dev/null || true"

echo ""
echo "3. Пересборка и деплой web контейнера..."
./deploy.sh --web

echo ""
echo "=== Проверка статуса ==="
sleep 5
ssh root@207.154.207.198 bash << 'REMOTE_CHECK'
echo "Проверка контейнеров:"
docker ps | grep evm-web || echo "Web контейнер не запущен"

echo ""
echo "Логи web контейнера (последние 20 строк):"
docker logs --tail 20 evm-web 2>&1 || echo "Не удалось получить логи"

echo ""
echo "Проверка доступности:"
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Web контейнер отвечает на порту 3000"
else
    echo "❌ Web контейнер не отвечает"
fi
REMOTE_CHECK

echo ""
echo "=== Готово ==="
echo "Проверьте сайт: https://cyberelka2077.ru"


