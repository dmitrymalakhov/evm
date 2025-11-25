#!/bin/bash

# Скрипт для настройки firewall на сервере
# Открывает порты 80 и 443 для HTTP/HTTPS

SERVER_IP="207.154.207.198"

echo "=== Настройка firewall на сервере $SERVER_IP ==="
echo ""

ssh root@$SERVER_IP << 'EOF'
set -e

echo "Текущие правила iptables для портов 80 и 443:"
iptables -L INPUT -n | grep -E "(80|443)" || echo "Правила не найдены"

echo ""
echo "Добавление правил для портов 80 и 443..."

# Удаляем старые правила если есть
iptables -D INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
iptables -D INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true

# Добавляем правила в начало цепочки (перед DROP)
iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 2 -p tcp --dport 443 -j ACCEPT

echo "✓ Правила добавлены"

echo ""
echo "Новые правила:"
iptables -L INPUT -n | head -5

echo ""
echo "Проверка доступности портов:"
ss -tlnp | grep -E ":(80|443)" || echo "Порты не слушаются"

echo ""
echo "⚠️  ВАЖНО: Если сервер на DigitalOcean, нужно также открыть порты в Cloud Firewall:"
echo "   1. Зайдите в DigitalOcean Dashboard"
echo "   2. Networking -> Firewalls"
echo "   3. Создайте или отредактируйте firewall для вашего Droplet"
echo "   4. Добавьте правила:"
echo "      - HTTP (80) - Allow Inbound"
echo "      - HTTPS (443) - Allow Inbound"

EOF

echo ""
echo "=== Готово ==="


