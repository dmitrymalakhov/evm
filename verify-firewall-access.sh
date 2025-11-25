#!/bin/bash

# Скрипт для проверки доступности портов через DigitalOcean API
# и диагностики проблем с firewall

SERVER_IP="207.154.207.198"
DOMAIN="cyberelka2077.ru"

echo "=========================================="
echo "  ПРОВЕРКА ДОСТУПНОСТИ САЙТА"
echo "=========================================="
echo ""

echo "=== 1. ПРОВЕРКА DNS ==="
echo "DNS запись для $DOMAIN:"
if command -v dig &> /dev/null; then
    dig +short $DOMAIN @8.8.8.8
elif command -v nslookup &> /dev/null; then
    nslookup $DOMAIN 8.8.8.8 | grep -A 1 "Name:" | tail -1
else
    echo "dig и nslookup не найдены"
fi
echo "Ожидаемый IP: $SERVER_IP"
echo ""

echo "=== 2. ПРОВЕРКА ДОСТУПНОСТИ ПОРТОВ ==="
echo "Проверка порта 80 (HTTP):"
if timeout 5 bash -c "echo > /dev/tcp/$SERVER_IP/80" 2>/dev/null; then
    echo "✓ Порт 80 открыт и доступен"
else
    echo "❌ Порт 80 ЗАБЛОКИРОВАН или недоступен"
    echo "   Это означает, что DigitalOcean Cloud Firewall блокирует доступ"
fi

echo "Проверка порта 443 (HTTPS):"
if timeout 5 bash -c "echo > /dev/tcp/$SERVER_IP/443" 2>/dev/null; then
    echo "✓ Порт 443 открыт и доступен"
else
    echo "❌ Порт 443 ЗАБЛОКИРОВАН или недоступен"
    echo "   Это означает, что DigitalOcean Cloud Firewall блокирует доступ"
fi
echo ""

echo "=== 3. ПРОВЕРКА HTTP/HTTPS ==="
echo "HTTP запрос:"
HTTP_RESPONSE=$(curl -I --max-time 10 http://$DOMAIN 2>&1)
if echo "$HTTP_RESPONSE" | grep -q "HTTP"; then
    echo "✓ HTTP работает"
    echo "$HTTP_RESPONSE" | head -1
else
    echo "❌ HTTP не работает"
    echo "   Ошибка: $(echo "$HTTP_RESPONSE" | tail -1)"
fi
echo ""

echo "HTTPS запрос:"
HTTPS_RESPONSE=$(curl -I -k --max-time 10 https://$DOMAIN 2>&1)
if echo "$HTTPS_RESPONSE" | grep -q "HTTP"; then
    echo "✓ HTTPS работает"
    echo "$HTTPS_RESPONSE" | head -1
else
    echo "❌ HTTPS не работает"
    echo "   Ошибка: $(echo "$HTTPS_RESPONSE" | tail -1)"
fi
echo ""

echo "=== 4. РЕЗЮМЕ ==="
if ! timeout 3 bash -c "echo > /dev/tcp/$SERVER_IP/80" 2>/dev/null; then
    echo "❌ ПРОБЛЕМА: Порт 80 заблокирован на уровне DigitalOcean Cloud Firewall"
    echo ""
    echo "РЕШЕНИЕ:"
    echo "1. Откройте DigitalOcean Dashboard"
    echo "2. Перейдите в Networking → Firewalls"
    echo "3. Откройте ваш firewall"
    echo "4. Проверьте вкладку 'Droplets' - убедитесь, что Droplet привязан"
    echo "5. Проверьте вкладку 'Rules' - убедитесь, что порты 80 и 443 открыты"
    echo "6. Если все настроено правильно, но не работает:"
    echo "   - Удалите firewall из Droplet"
    echo "   - Подождите 1 минуту"
    echo "   - Снова привяжите firewall к Droplet"
    echo "   - Подождите еще 1-2 минуты"
elif ! timeout 3 bash -c "echo > /dev/tcp/$SERVER_IP/443" 2>/dev/null; then
    echo "❌ ПРОБЛЕМА: Порт 443 заблокирован на уровне DigitalOcean Cloud Firewall"
    echo ""
    echo "РЕШЕНИЕ: То же самое, что и для порта 80"
else
    echo "✓ Порты открыты, но сайт не работает"
    echo "   Проблема может быть в:"
    echo "   - Nginx конфигурации"
    echo "   - Docker контейнерах"
    echo "   - DNS настройках"
fi

echo ""
echo "=========================================="


