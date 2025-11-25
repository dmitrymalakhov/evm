#!/bin/bash

# Полная диагностика доступности сайта

SERVER_IP="207.154.207.198"
DOMAIN="cyberelka2077.ru"

echo "=========================================="
echo "  ПОЛНАЯ ДИАГНОСТИКА САЙТА"
echo "=========================================="
echo ""

echo "=== 1. ПРОВЕРКА DNS ==="
echo "DNS запись для $DOMAIN:"
nslookup $DOMAIN 8.8.8.8 | grep -A 1 "Name:" || echo "❌ DNS не резолвится"
echo ""

echo "=== 2. ПРОВЕРКА ДОСТУПНОСТИ ПОРТОВ ==="
echo "Проверка порта 80 (HTTP):"
if timeout 3 bash -c "echo > /dev/tcp/$SERVER_IP/80" 2>/dev/null; then
    echo "✓ Порт 80 открыт"
else
    echo "❌ Порт 80 ЗАБЛОКИРОВАН"
fi

echo "Проверка порта 443 (HTTPS):"
if timeout 3 bash -c "echo > /dev/tcp/$SERVER_IP/443" 2>/dev/null; then
    echo "✓ Порт 443 открыт"
else
    echo "❌ Порт 443 ЗАБЛОКИРОВАН"
fi
echo ""

echo "=== 3. ПРОВЕРКА ПО IP АДРЕСУ ==="
echo "HTTP по IP:"
HTTP_IP=$(curl -I --max-time 5 http://$SERVER_IP 2>&1 | head -1)
if echo "$HTTP_IP" | grep -q "HTTP"; then
    echo "✓ HTTP работает: $HTTP_IP"
else
    echo "❌ HTTP не работает"
fi

echo "HTTPS по IP:"
HTTPS_IP=$(curl -I -k --max-time 5 https://$SERVER_IP 2>&1 | head -1)
if echo "$HTTPS_IP" | grep -q "HTTP"; then
    echo "✓ HTTPS работает: $HTTPS_IP"
else
    echo "❌ HTTPS не работает"
fi
echo ""

echo "=== 4. ПРОВЕРКА ПО ДОМЕНУ ==="
echo "HTTP по домену:"
HTTP_DOMAIN=$(curl -I --max-time 5 http://$DOMAIN 2>&1 | head -1)
if echo "$HTTP_DOMAIN" | grep -q "HTTP"; then
    echo "✓ HTTP по домену работает: $HTTP_DOMAIN"
else
    echo "❌ HTTP по домену не работает"
    echo "   Ошибка: $(echo "$HTTP_DOMAIN" | tail -1)"
fi

echo "HTTPS по домену:"
HTTPS_DOMAIN=$(curl -I --max-time 5 https://$DOMAIN 2>&1 | head -1)
if echo "$HTTPS_DOMAIN" | grep -q "HTTP"; then
    echo "✓ HTTPS по домену работает: $HTTPS_DOMAIN"
else
    echo "❌ HTTPS по домену не работает"
    echo "   Ошибка: $(echo "$HTTPS_DOMAIN" | tail -1)"
fi
echo ""

echo "=== 5. РЕЗЮМЕ ==="
if echo "$HTTP_IP" | grep -q "HTTP" && echo "$HTTPS_IP" | grep -q "HTTP"; then
    echo "✓ Сервер работает по IP адресу"
    if ! echo "$HTTP_DOMAIN" | grep -q "HTTP" || ! echo "$HTTPS_DOMAIN" | grep -q "HTTP"; then
        echo "⚠️  ПРОБЛЕМА: Сайт работает по IP, но не работает по домену"
        echo ""
        echo "Возможные причины:"
        echo "1. Cloud Firewall в DigitalOcean блокирует порты 80/443"
        echo "2. Firewall не привязан к Droplet"
        echo "3. DNS еще не распространился полностью"
        echo ""
        echo "РЕШЕНИЕ:"
        echo "1. Проверьте в DigitalOcean Dashboard → Networking → Firewalls"
        echo "2. Убедитесь что firewall привязан к Droplet $SERVER_IP"
        echo "3. Убедитесь что правила для портов 80 и 443 активны"
    fi
else
    echo "❌ Сервер не отвечает по IP адресу"
    echo "   Проверьте статус контейнеров и Nginx на сервере"
fi

echo ""
echo "=========================================="


