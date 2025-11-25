#!/bin/bash

# Скрипт для проверки доступности сайта извне

SERVER_IP="207.154.207.198"
DOMAIN="cyberelka2077.ru"

echo "=== Проверка доступности сайта извне ==="
echo ""

echo "1. Проверка DNS:"
echo "   nslookup $DOMAIN 8.8.8.8"
nslookup $DOMAIN 8.8.8.8 | grep -A 1 "Name:" || echo "   ❌ DNS не резолвится"

echo ""
echo "2. Проверка доступности порта 80 (HTTP):"
if curl -I --max-time 5 http://$SERVER_IP 2>&1 | grep -q "HTTP"; then
    echo "   ✓ Порт 80 доступен"
    curl -I --max-time 5 http://$SERVER_IP 2>&1 | head -3
else
    echo "   ❌ Порт 80 НЕ доступен извне"
fi

echo ""
echo "3. Проверка доступности порта 443 (HTTPS):"
if curl -I -k --max-time 5 https://$SERVER_IP 2>&1 | grep -q "HTTP"; then
    echo "   ✓ Порт 443 доступен"
    curl -I -k --max-time 5 https://$SERVER_IP 2>&1 | head -3
else
    echo "   ❌ Порт 443 НЕ доступен извне"
fi

echo ""
echo "4. Проверка по домену (HTTP):"
if curl -I --max-time 5 http://$DOMAIN 2>&1 | grep -q "HTTP"; then
    echo "   ✓ HTTP по домену работает"
    curl -I --max-time 5 http://$DOMAIN 2>&1 | head -3
else
    echo "   ❌ HTTP по домену НЕ работает"
    echo "   Попробуйте: curl -v --max-time 5 http://$DOMAIN"
fi

echo ""
echo "5. Проверка по домену (HTTPS):"
if curl -I --max-time 5 https://$DOMAIN 2>&1 | grep -q "HTTP"; then
    echo "   ✓ HTTPS по домену работает"
    curl -I --max-time 5 https://$DOMAIN 2>&1 | head -3
else
    echo "   ❌ HTTPS по домену НЕ работает"
    echo "   Попробуйте: curl -v -k --max-time 5 https://$DOMAIN"
fi

echo ""
echo "=== Рекомендации ==="
echo ""
echo "Если порты 80/443 НЕ доступны извне:"
echo "1. Проверьте Cloud Firewall в DigitalOcean Dashboard"
echo "2. Убедитесь что порты 80 и 443 открыты для входящих соединений"
echo "3. Проверьте настройки Droplet в DigitalOcean"
echo ""
echo "Если DNS не резолвится правильно:"
echo "1. Проверьте DNS записи в DigitalOcean"
echo "2. Подождите несколько минут для распространения DNS"
echo "3. Используйте другой DNS сервер (8.8.8.8, 1.1.1.1)"


