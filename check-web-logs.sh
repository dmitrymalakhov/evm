#!/bin/bash

# Скрипт для проверки логов web контейнера на сервере
# Использование: ./check-web-logs.sh [IP_ADDRESS]

SERVER_IP="${1:-207.154.207.198}"

echo "=== Проверка web контейнера на сервере $SERVER_IP ==="
echo ""

ssh root@$SERVER_IP bash << 'REMOTE_SCRIPT'
set +e

echo "=== Все контейнеры (включая остановленные) ==="
docker ps -a | grep evm || echo "Контейнеры evm не найдены"
echo ""

echo "=== Web контейнер - детальная информация ==="
if docker ps -a | grep -q evm-web; then
    echo "Статус:"
    docker ps -a | grep evm-web
    echo ""
    echo "Логи (последние 50 строк):"
    docker logs evm-web --tail 50 2>&1
    echo ""
    echo "Инспект контейнера:"
    docker inspect evm-web --format='{{.State.Status}} - ExitCode: {{.State.ExitCode}}' 2>/dev/null
    echo ""
    echo "Причина остановки:"
    docker inspect evm-web --format='{{.State.Error}}' 2>/dev/null
else
    echo "❌ Контейнер evm-web не найден"
    echo ""
    echo "Проверка образа:"
    docker images | grep evm-web || echo "Образ evm-web не найден"
fi
echo ""

echo "=== Попытка запуска web контейнера ==="
cd /root/evm 2>/dev/null || echo "Директория /root/evm не найдена"

if [ -f docker-compose.prod.yml ]; then
    echo "Запуск через docker-compose..."
    docker-compose -f docker-compose.prod.yml up -d web 2>&1 || docker compose -f docker-compose.prod.yml up -d web 2>&1
    echo ""
    sleep 3
    echo "Статус после запуска:"
    docker ps -a | grep evm-web || echo "Контейнер все еще не найден"
    echo ""
    if docker ps -a | grep -q evm-web; then
        echo "Логи после запуска (последние 20 строк):"
        docker logs evm-web --tail 20 2>&1
    fi
else
    echo "❌ docker-compose.prod.yml не найден"
fi
REMOTE_SCRIPT

