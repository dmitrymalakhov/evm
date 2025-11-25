#!/bin/bash

# Тест доступности портов извне через онлайн-сервисы

SERVER_IP="207.154.207.198"
DOMAIN="cyberelka2077.ru"

echo "=== ТЕСТ ДОСТУПНОСТИ ИЗВНЕ ==="
echo ""

echo "1. Проверка доступности порта 80 через онлайн-сервис:"
echo "   Откройте: https://www.yougetsignal.com/tools/open-ports/"
echo "   Введите IP: $SERVER_IP"
echo "   Введите порт: 80"
echo "   Нажмите 'Check'"
echo ""

echo "2. Проверка доступности порта 443 через онлайн-сервис:"
echo "   Откройте: https://www.yougetsignal.com/tools/open-ports/"
echo "   Введите IP: $SERVER_IP"
echo "   Введите порт: 443"
echo "   Нажмите 'Check'"
echo ""

echo "3. Проверка доступности сайта через онлайн-сервисы:"
echo "   - https://www.isitdownrightnow.com/$DOMAIN.html"
echo "   - https://downforeveryoneorjustme.com/$DOMAIN"
echo "   - https://www.uptrends.com/tools/uptime"
echo ""

echo "4. Проверка через curl с вашего компьютера:"
echo "   curl -I http://$DOMAIN"
echo "   curl -I https://$DOMAIN"
echo ""

echo "5. Проверка DNS резолвинга:"
dig +short $DOMAIN @8.8.8.8
echo "   Ожидаемый IP: $SERVER_IP"
echo ""

echo "=== ЕСЛИ ПОРТЫ ЗАБЛОКИРОВАНЫ ==="
echo ""
echo "Проверьте в DigitalOcean Dashboard:"
echo "1. Networking → Firewalls → ваш firewall"
echo "2. Убедитесь, что правила для портов 80 и 443 имеют:"
echo "   - Sources: All IPv4, All IPv6"
echo "3. Убедитесь, что Droplet привязан к firewall"
echo "4. Если есть несколько firewall, проверьте все"
echo ""


