#!/bin/bash

# Скрипт для диагностики проблем с web контейнером
# Использование: ./check-web-container.sh [IP_ADDRESS]

set -e

SERVER_IP="${1:-207.154.207.198}"

echo "=== Диагностика web контейнера на сервере $SERVER_IP ==="
echo ""

ssh root@$SERVER_IP bash << 'REMOTE_SCRIPT'
echo "=== Проверка статуса контейнеров ==="
docker ps -a | grep evm-web || echo "Контейнер evm-web не найден"

echo ""
echo "=== Логи web контейнера (последние 50 строк) ==="
docker logs --tail 50 evm-web 2>&1 || echo "Не удалось получить логи"

echo ""
echo "=== Проверка портов ==="
netstat -tuln | grep :3000 || ss -tuln | grep :3000 || echo "Порт 3000 не слушается"

echo ""
echo "=== Проверка доступности web контейнера ==="
curl -v http://localhost:3000 2>&1 | head -20 || echo "Web контейнер недоступен на localhost:3000"

echo ""
echo "=== Проверка конфигурации nginx ==="
if [ -f /etc/nginx/sites-available/cyberelka2077.ru.conf ]; then
    echo "Конфигурация nginx:"
    grep -A 5 "location /" /etc/nginx/sites-available/cyberelka2077.ru.conf | head -10
else
    echo "Конфигурация nginx не найдена"
fi

echo ""
echo "=== Проверка переменных окружения web контейнера ==="
docker inspect evm-web --format='{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -E "PORT|HOSTNAME|NEXT_PUBLIC" || echo "Не удалось получить переменные окружения"

echo ""
echo "=== Проверка Docker Compose конфигурации ==="
if [ -f /root/evm/docker-compose.prod.yml ]; then
    echo "Проверка web сервиса:"
    grep -A 10 "^  web:" /root/evm/docker-compose.prod.yml | head -15
else
    echo "docker-compose.prod.yml не найден"
fi
REMOTE_SCRIPT

