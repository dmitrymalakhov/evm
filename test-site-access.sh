#!/bin/bash

# Скрипт для проверки доступности сайта с сервера

SERVER_IP="207.154.207.198"
DOMAIN="cyberelka2077.ru"

echo "=== Проверка доступности сайта с сервера ==="
echo ""

echo "1. Проверка DNS резолвинга:"
nslookup $DOMAIN 8.8.8.8 | grep -A 2 "Name:"
echo ""

echo "2. Проверка HTTP по домену:"
curl -I --max-time 5 http://$DOMAIN 2>&1 | head -3
echo ""

echo "3. Проверка HTTPS по домену:"
curl -I -k --max-time 5 https://$DOMAIN 2>&1 | head -3
echo ""

echo "4. Проверка HTTP по IP:"
curl -I --max-time 5 http://$SERVER_IP 2>&1 | head -3
echo ""

echo "5. Проверка HTTPS по IP:"
curl -I -k --max-time 5 https://$SERVER_IP 2>&1 | head -3
echo ""

echo "6. Проверка с правильным Host заголовком (HTTP):"
curl -I -H "Host: $DOMAIN" --max-time 5 http://127.0.0.1 2>&1 | head -3
echo ""

echo "7. Проверка с правильным Host заголовком (HTTPS):"
curl -I -k -H "Host: $DOMAIN" --max-time 5 https://127.0.0.1 2>&1 | head -3
echo ""

echo "=== Проверка завершена ==="


