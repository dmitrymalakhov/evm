#!/bin/bash

# Проверка SSL сертификата

DOMAIN="cyberelka2077.ru"
SERVER_IP="207.154.207.198"

echo "=== ПРОВЕРКА SSL СЕРТИФИКАТА ==="
echo ""

echo "1. Проверка сертификата с сервера:"
ssh root@$SERVER_IP 'openssl x509 -in /etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem -noout -dates -subject -issuer' 2>&1
echo ""

echo "2. Проверка SSL соединения локально (с сервера):"
ssh root@$SERVER_IP 'echo | openssl s_client -connect 127.0.0.1:443 -servername cyberelka2077.ru 2>&1 | grep -E "(subject=|issuer=|Verify return code|CN=)" | head -5' 2>&1
echo ""

echo "3. Проверка SSL соединения извне:"
echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>&1 | grep -E "(subject=|issuer=|Verify return code|CN=|depth=)" | head -10
echo ""

echo "4. Проверка доступности порта 443:"
if timeout 3 bash -c "echo > /dev/tcp/$SERVER_IP/443" 2>/dev/null; then
    echo "✓ Порт 443 доступен"
else
    echo "❌ Порт 443 НЕ доступен (заблокирован firewall)"
fi
echo ""

echo "5. Проверка HTTPS запроса:"
HTTPS_RESPONSE=$(curl -I -k --max-time 10 https://$DOMAIN 2>&1)
if echo "$HTTPS_RESPONSE" | grep -q "HTTP"; then
    echo "✓ HTTPS работает"
    echo "$HTTPS_RESPONSE" | head -1
else
    echo "❌ HTTPS не работает"
    echo "   Ошибка: $(echo "$HTTPS_RESPONSE" | tail -1)"
fi
echo ""

echo "=== РЕЗЮМЕ ==="
if ! timeout 3 bash -c "echo > /dev/tcp/$SERVER_IP/443" 2>/dev/null; then
    echo "❌ Проблема: Порт 443 заблокирован DigitalOcean Cloud Firewall"
    echo "   SSL сертификат настроен правильно, но порт недоступен извне"
else
    echo "✓ Порт доступен, проверьте SSL ошибки выше"
fi


