#!/bin/bash

# Скрипт для диагностики проблем с веб-порталом на продакшене
# Использование: ./diagnose-web-production.sh [IP_ADDRESS]

set -e

SERVER_IP="${1:-207.154.207.198}"

echo "=========================================="
echo "  ДИАГНОСТИКА ВЕБ-ПОРТАЛА НА ПРОДАКШЕНЕ"
echo "=========================================="
echo ""
echo "Сервер: $SERVER_IP"
echo ""

ssh root@$SERVER_IP bash << 'REMOTE_SCRIPT'
set -e

echo "=== 1. ПРОВЕРКА СТАТУСА КОНТЕЙНЕРОВ ==="
echo ""
docker ps -a | grep evm || echo "Контейнеры evm не найдены"
echo ""

echo "=== 2. ПРОВЕРКА WEB КОНТЕЙНЕРА ==="
echo ""
if docker ps -a | grep -q evm-web; then
    echo "Статус web контейнера:"
    docker ps -a | grep evm-web
    echo ""
    
    echo "Логи web контейнера (последние 50 строк):"
    docker logs --tail 50 evm-web 2>&1 || echo "Не удалось получить логи"
    echo ""
    
    echo "Проверка переменных окружения:"
    docker inspect evm-web --format='{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -E "PORT|HOSTNAME|NEXT_PUBLIC|NODE_ENV" || echo "Не удалось получить переменные окружения"
    echo ""
    
    echo "Проверка файлов в контейнере:"
    if docker exec evm-web test -f /app/server.js 2>/dev/null; then
        echo "✓ server.js найден"
        docker exec evm-web ls -lh /app/server.js 2>/dev/null
    else
        echo "❌ server.js НЕ найден"
        echo "Содержимое /app:"
        docker exec evm-web ls -la /app 2>/dev/null | head -20
    fi
    echo ""
    
    echo "Проверка node_modules:"
    if docker exec evm-web test -d /app/node_modules 2>/dev/null; then
        echo "✓ node_modules найден"
        echo "  Проверка styled-jsx:"
        if docker exec evm-web test -d /app/node_modules/styled-jsx 2>/dev/null; then
            echo "  ✓ styled-jsx найден"
        else
            echo "  ❌ styled-jsx НЕ найден"
        fi
    else
        echo "❌ node_modules НЕ найден"
    fi
    echo ""
else
    echo "❌ Контейнер evm-web не найден"
    echo ""
fi

echo "=== 3. ПРОВЕРКА ПОРТОВ ==="
echo ""
echo "Проверка порта 3000:"
if ss -tuln 2>/dev/null | grep -q ":3000 " || netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "✓ Порт 3000 слушается"
    ss -tuln 2>/dev/null | grep ":3000 " || netstat -tuln 2>/dev/null | grep ":3000 "
else
    echo "❌ Порт 3000 НЕ слушается"
fi
echo ""

echo "=== 4. ПРОВЕРКА ДОСТУПНОСТИ WEB КОНТЕЙНЕРА ==="
echo ""
echo "Проверка HTTP ответа на localhost:3000:"
if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 2>&1; then
    echo "✓ Web контейнер отвечает"
else
    echo "❌ Web контейнер НЕ отвечает"
    echo "Детали ошибки:"
    curl -v http://localhost:3000 2>&1 | head -30
fi
echo ""

echo "=== 5. ПРОВЕРКА NGINX ==="
echo ""
if command -v nginx &> /dev/null; then
    echo "Статус nginx:"
    systemctl status nginx --no-pager -l 2>&1 | head -10 || service nginx status 2>&1 | head -10
    echo ""
    
    echo "Проверка конфигурации nginx:"
    if [ -f /etc/nginx/sites-available/cyberelka2077.ru.conf ]; then
        echo "✓ Конфигурация найдена"
        echo "  Проверка proxy_pass для web:"
        grep -A 3 "location /" /etc/nginx/sites-available/cyberelka2077.ru.conf | head -5
    elif [ -f /etc/nginx/conf.d/cyberelka2077.ru.conf ]; then
        echo "✓ Конфигурация найдена в conf.d"
        grep -A 3 "location /" /etc/nginx/conf.d/cyberelka2077.ru.conf | head -5
    else
        echo "⚠️  Конфигурация nginx не найдена в стандартных местах"
        echo "  Поиск конфигурации:"
        find /etc/nginx -name "*cyberelka*" 2>/dev/null || echo "  Не найдено"
    fi
    echo ""
    
    echo "Проверка доступности через nginx:"
    if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost 2>&1; then
        echo "✓ Nginx отвечает"
    else
        echo "❌ Nginx НЕ отвечает"
    fi
    echo ""
    
    echo "Последние ошибки nginx:"
    tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Лог ошибок недоступен"
    echo ""
else
    echo "⚠️  Nginx не установлен или не найден"
    echo ""
fi

echo "=== 6. ПРОВЕРКА DOCKER COMPOSE ==="
echo ""
cd /root/evm 2>/dev/null || { echo "❌ Директория /root/evm не найдена"; exit 1; }

if [ -f docker-compose.prod.yml ]; then
    echo "✓ docker-compose.prod.yml найден"
    echo ""
    echo "Конфигурация web сервиса:"
    grep -A 15 "^  web:" docker-compose.prod.yml | head -20
    echo ""
else
    echo "❌ docker-compose.prod.yml не найден"
    echo ""
fi

echo "=== 7. ПРОВЕРКА ФАЙЛОВ ПРОЕКТА ==="
echo ""
if [ -d web/.next ]; then
    echo "✓ web/.next найден"
    if [ -d web/.next/standalone ]; then
        echo "✓ web/.next/standalone найден"
        if [ -f web/.next/standalone/server.js ]; then
            echo "✓ server.js найден в standalone"
        else
            echo "❌ server.js НЕ найден в standalone"
            echo "  Содержимое standalone:"
            ls -la web/.next/standalone/ | head -10
        fi
    else
        echo "❌ web/.next/standalone НЕ найден"
        echo "  Содержимое .next:"
        ls -la web/.next/ | head -10
    fi
else
    echo "❌ web/.next не найден - проект не собран"
fi
echo ""

echo "=== 8. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ==="
echo ""
if [ -f /root/evm/.env ]; then
    echo "✓ .env файл найден"
    echo "  NEXT_PUBLIC_API_URL:"
    grep NEXT_PUBLIC_API_URL /root/evm/.env || echo "  Не установлено"
    echo "  WEB_PORT:"
    grep WEB_PORT /root/evm/.env || echo "  Не установлено (будет использован дефолт 3000)"
else
    echo "⚠️  .env файл не найден"
fi
echo ""

echo "=== 9. ПРОВЕРКА СЕТИ DOCKER ==="
echo ""
echo "Проверка сети evm-network:"
docker network ls | grep evm-network || echo "Сеть evm-network не найдена"
if docker network ls | grep -q evm-network; then
    echo "Контейнеры в сети:"
    docker network inspect evm-network --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "Не удалось получить информацию"
fi
echo ""

echo "=== 10. РЕЗЮМЕ ==="
echo ""
WEB_RUNNING=false
WEB_ACCESSIBLE=false
NGINX_RUNNING=false

if docker ps | grep -q evm-web; then
    WEB_RUNNING=true
fi

if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    WEB_ACCESSIBLE=true
fi

if systemctl is-active --quiet nginx 2>/dev/null || service nginx status > /dev/null 2>&1; then
    NGINX_RUNNING=true
fi

echo "Статус компонентов:"
echo "  Web контейнер запущен: $WEB_RUNNING"
echo "  Web контейнер доступен: $WEB_ACCESSIBLE"
echo "  Nginx запущен: $NGINX_RUNNING"
echo ""

if [ "$WEB_RUNNING" = true ] && [ "$WEB_ACCESSIBLE" = true ]; then
    echo "✅ Web контейнер работает корректно"
    if [ "$NGINX_RUNNING" = true ]; then
        echo "✅ Nginx запущен"
        echo ""
        echo "Проверьте доступность сайта:"
        echo "  https://cyberelka2077.ru"
    else
        echo "⚠️  Nginx не запущен - проверьте конфигурацию"
    fi
else
    echo "❌ Проблема с web контейнером"
    echo ""
    echo "Рекомендации:"
    if [ "$WEB_RUNNING" = false ]; then
        echo "  1. Перезапустите контейнер: cd /root/evm && docker-compose -f docker-compose.prod.yml up -d web"
    fi
    if [ "$WEB_ACCESSIBLE" = false ]; then
        echo "  2. Проверьте логи: docker logs evm-web --tail 100"
        echo "  3. Проверьте, что порт 3000 не занят другим процессом"
    fi
fi
echo ""

REMOTE_SCRIPT

echo ""
echo "Диагностика завершена."


