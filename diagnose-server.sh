#!/bin/bash

# Комплексный скрипт диагностики сервера
# Использование: ./diagnose-server.sh [IP_ADDRESS]

set -e

SERVER_IP="${1:-207.154.207.198}"

echo "=========================================="
echo "  ДИАГНОСТИКА СЕРВЕРА $SERVER_IP"
echo "=========================================="
echo ""

ssh root@$SERVER_IP bash << 'REMOTE_SCRIPT'
set +e

echo "=== 1. СТАТУС DOCKER КОНТЕЙНЕРОВ ==="
echo ""
docker ps -a | grep evm || echo "Контейнеры evm не найдены"
echo ""

echo "=== 2. ЛОГИ WEB КОНТЕЙНЕРА (последние 30 строк) ==="
echo ""
if docker ps -a | grep -q evm-web; then
    docker logs --tail 30 evm-web 2>&1
else
    echo "❌ Контейнер evm-web не найден"
fi
echo ""

echo "=== 3. ЛОГИ API КОНТЕЙНЕРА (последние 20 строк) ==="
echo ""
if docker ps -a | grep -q evm-api; then
    docker logs --tail 20 evm-api 2>&1
else
    echo "❌ Контейнер evm-api не найден"
fi
echo ""

echo "=== 4. ПРОВЕРКА ПОРТОВ ==="
echo ""
echo "Порт 80 (HTTP):"
if ss -tuln 2>/dev/null | grep -q ":80 "; then
    echo "  ✓ Порт 80 слушается"
    ss -tuln 2>/dev/null | grep ":80 " || netstat -tuln 2>/dev/null | grep ":80 "
else
    echo "  ❌ Порт 80 НЕ слушается"
fi
echo ""

echo "Порт 443 (HTTPS):"
if ss -tuln 2>/dev/null | grep -q ":443 "; then
    echo "  ✓ Порт 443 слушается"
    ss -tuln 2>/dev/null | grep ":443 " || netstat -tuln 2>/dev/null | grep ":443 "
else
    echo "  ❌ Порт 443 НЕ слушается"
fi
echo ""

echo "Порт 3000 (Web контейнер):"
if ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "  ✓ Порт 3000 слушается"
    ss -tuln 2>/dev/null | grep ":3000 " || netstat -tuln 2>/dev/null | grep ":3000 "
else
    echo "  ❌ Порт 3000 НЕ слушается (web контейнер не доступен)"
fi
echo ""

echo "Порт 4000 (API контейнер):"
if ss -tuln 2>/dev/null | grep -q ":4000 "; then
    echo "  ✓ Порт 4000 слушается"
    ss -tuln 2>/dev/null | grep ":4000 " || netstat -tuln 2>/dev/null | grep ":4000 "
else
    echo "  ❌ Порт 4000 НЕ слушается (API контейнер не доступен)"
fi
echo ""

echo "=== 5. ПРОВЕРКА ДОСТУПНОСТИ СЕРВИСОВ ИЗНУТРИ ==="
echo ""
echo "Web контейнер (localhost:3000):"
if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 2>&1; then
    echo "  ✓ Web контейнер отвечает"
else
    echo "  ❌ Web контейнер НЕ отвечает"
    curl -v http://localhost:3000 2>&1 | head -10
fi
echo ""

echo "API контейнер (localhost:4000/health):"
if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4000/health 2>&1; then
    echo "  ✓ API контейнер отвечает"
    curl -s http://localhost:4000/health | head -5
else
    echo "  ❌ API контейнер НЕ отвечает"
    curl -v http://localhost:4000/health 2>&1 | head -10
fi
echo ""

echo "=== 6. СТАТУС NGINX ==="
echo ""
if systemctl is-active --quiet nginx 2>/dev/null || service nginx status > /dev/null 2>&1; then
    echo "✓ Nginx работает"
    systemctl status nginx --no-pager -l 2>/dev/null | head -10 || service nginx status 2>/dev/null | head -10
else
    echo "❌ Nginx НЕ работает"
fi
echo ""

echo "=== 7. КОНФИГУРАЦИЯ NGINX ==="
echo ""
if [ -f /etc/nginx/sites-available/cyberelka2077.ru.conf ]; then
    echo "✓ Конфигурация найдена"
    echo ""
    echo "Проверка конфигурации:"
    nginx -t 2>&1
    echo ""
    echo "Настройки проксирования:"
    echo "  Web (порт 3000):"
    if grep -q "proxy_pass.*127.0.0.1:3000" /etc/nginx/sites-available/cyberelka2077.ru.conf; then
        echo "    ✓ Проксирование на web настроено"
        grep "proxy_pass.*127.0.0.1:3000" /etc/nginx/sites-available/cyberelka2077.ru.conf | head -1
    else
        echo "    ❌ Проксирование на web НЕ настроено"
    fi
    echo ""
    echo "  API (порт 4000):"
    if grep -q "proxy_pass.*127.0.0.1:4000" /etc/nginx/sites-available/cyberelka2077.ru.conf; then
        echo "    ✓ Проксирование на API настроено"
        grep "proxy_pass.*127.0.0.1:4000" /etc/nginx/sites-available/cyberelka2077.ru.conf | head -1
    else
        echo "    ❌ Проксирование на API НЕ настроено"
    fi
else
    echo "❌ Конфигурация nginx не найдена"
fi
echo ""

echo "=== 8. SSL СЕРТИФИКАТЫ ==="
echo ""
if [ -f /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem ]; then
    echo "✓ SSL сертификат найден"
    CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "  Срок действия: $CERT_EXPIRY"
    
    # Проверка валидности сертификата
    if openssl x509 -in /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem -noout -checkend 0 2>/dev/null; then
        echo "  ✓ Сертификат валиден"
    else
        echo "  ❌ Сертификат истек или невалиден"
    fi
else
    echo "❌ SSL сертификат не найден"
fi
echo ""

echo "=== 9. ПРОВЕРКА ДОСТУПНОСТИ ЧЕРЕЗ NGINX ==="
echo ""
echo "HTTP (порт 80):"
if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost 2>&1; then
    echo "  ✓ Nginx отвечает на HTTP"
else
    echo "  ❌ Nginx НЕ отвечает на HTTP"
    curl -v http://localhost 2>&1 | head -10
fi
echo ""

echo "HTTPS (порт 443):"
if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" -k https://localhost 2>&1; then
    echo "  ✓ Nginx отвечает на HTTPS"
else
    echo "  ❌ Nginx НЕ отвечает на HTTPS"
    curl -v -k https://localhost 2>&1 | head -10
fi
echo ""

echo "=== 10. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ КОНТЕЙНЕРОВ ==="
echo ""
echo "Web контейнер:"
docker inspect evm-web --format='{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -E "PORT|HOSTNAME|NEXT_PUBLIC|NODE_ENV" || echo "Не удалось получить переменные"
echo ""

echo "API контейнер:"
docker inspect evm-api --format='{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -E "PORT|HOST|CORS|NODE_ENV" || echo "Не удалось получить переменные"
echo ""

echo "=== 11. ПРОВЕРКА ФАЙЛОВ В КОНТЕЙНЕРАХ ==="
echo ""
echo "Web контейнер - проверка server.js:"
if docker exec evm-web test -f /app/server.js 2>/dev/null; then
    echo "  ✓ server.js существует"
    docker exec evm-web ls -la /app/server.js 2>/dev/null || echo "  Не удалось проверить"
else
    echo "  ❌ server.js НЕ найден"
fi
echo ""

echo "Web контейнер - проверка node_modules:"
if docker exec evm-web test -d /app/node_modules 2>/dev/null; then
    echo "  ✓ node_modules существует"
    docker exec evm-web ls /app/node_modules 2>/dev/null | head -10 || echo "  Не удалось проверить"
    
    # Проверка styled-jsx
    if docker exec evm-web test -d /app/node_modules/styled-jsx 2>/dev/null; then
        echo "  ✓ styled-jsx найден"
    else
        echo "  ❌ styled-jsx НЕ найден (это может быть проблемой!)"
    fi
else
    echo "  ❌ node_modules НЕ найден"
fi
echo ""

echo "=== 12. ЛОГИ NGINX (последние 10 ошибок) ==="
echo ""
if [ -f /var/log/nginx/error.log ]; then
    echo "Последние ошибки nginx:"
    tail -10 /var/log/nginx/error.log 2>/dev/null || echo "Не удалось прочитать логи"
else
    echo "Файл логов nginx не найден"
fi
echo ""

echo "=== 13. ПРОВЕРКА DNS ==="
echo ""
echo "Проверка A записи для cyberelka2077.ru:"
if command -v dig &> /dev/null; then
    dig +short cyberelka2077.ru A || echo "dig не доступен"
else
    echo "dig не установлен, используем nslookup:"
    nslookup cyberelka2077.ru 2>/dev/null || echo "nslookup не доступен"
fi
echo ""

echo "=== 14. ПРОВЕРКА FIREWALL ==="
echo ""
if command -v ufw &> /dev/null; then
    echo "UFW статус:"
    ufw status 2>/dev/null | head -10 || echo "UFW не настроен"
elif command -v iptables &> /dev/null; then
    echo "Проверка iptables правил для портов 80 и 443:"
    iptables -L -n 2>/dev/null | grep -E "80|443" | head -5 || echo "Правила не найдены или firewall не настроен"
else
    echo "Firewall не найден или не настроен"
fi
echo ""

echo "=== 15. РЕЗЮМЕ ==="
echo ""
ISSUES=0

# Проверка контейнеров
if ! docker ps | grep -q evm-web; then
    echo "❌ Web контейнер не запущен"
    ISSUES=$((ISSUES + 1))
fi

if ! docker ps | grep -q evm-api; then
    echo "❌ API контейнер не запущен"
    ISSUES=$((ISSUES + 1))
fi

# Проверка портов
if ! ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "❌ Порт 3000 не слушается"
    ISSUES=$((ISSUES + 1))
fi

if ! ss -tuln 2>/dev/null | grep -q ":4000 "; then
    echo "❌ Порт 4000 не слушается"
    ISSUES=$((ISSUES + 1))
fi

# Проверка nginx
if ! systemctl is-active --quiet nginx 2>/dev/null; then
    echo "❌ Nginx не работает"
    ISSUES=$((ISSUES + 1))
fi

# Проверка доступности
if ! curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Web контейнер не отвечает на localhost:3000"
    ISSUES=$((ISSUES + 1))
fi

if ! curl -f -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "❌ API контейнер не отвечает на localhost:4000/health"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ Все основные проверки пройдены!"
    echo ""
    echo "Если сайт все еще не работает, проверьте:"
    echo "  1. DNS записи указывают на этот сервер"
    echo "  2. Firewall разрешает входящие соединения на порты 80 и 443"
    echo "  3. Провайдер не блокирует порты"
else
    echo ""
    echo "⚠️  Найдено проблем: $ISSUES"
    echo "Исправьте их перед проверкой доступности сайта извне"
fi

REMOTE_SCRIPT

echo ""
echo "=========================================="
echo "  ДИАГНОСТИКА ЗАВЕРШЕНА"
echo "=========================================="


