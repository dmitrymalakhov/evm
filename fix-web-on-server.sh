#!/bin/bash

# Скрипт для исправления web контейнера на сервере
# Запустите на сервере: bash fix-web-on-server.sh

set -e

echo "=========================================="
echo "  ИСПРАВЛЕНИЕ WEB КОНТЕЙНЕРА"
echo "=========================================="
echo ""

cd /root/evm || { echo "❌ Директория /root/evm не найдена"; exit 1; }

echo "=== 1. ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ==="
echo ""
echo "Статус контейнеров:"
docker ps -a | grep evm || echo "Контейнеры evm не найдены"
echo ""

echo "=== 2. ОСТАНОВКА И УДАЛЕНИЕ СТАРОГО WEB КОНТЕЙНЕРА ==="
echo ""
if docker ps -a | grep -q evm-web; then
    echo "Остановка web контейнера..."
    docker stop evm-web 2>/dev/null || true
    echo "Удаление web контейнера..."
    docker rm evm-web 2>/dev/null || true
    echo "✓ Старый контейнер удален"
else
    echo "✓ Старый контейнер не найден"
fi
echo ""

echo "=== 3. ПРОВЕРКА ОБРАЗА ==="
echo ""
if docker images | grep -q evm-web; then
    echo "Образ evm-web найден:"
    docker images | grep evm-web
    echo ""
    echo "Удаление старого образа для пересборки..."
    docker rmi evm-web:latest 2>/dev/null || true
    echo "✓ Старый образ удален"
else
    echo "✓ Образ evm-web не найден (будет создан при сборке)"
fi
echo ""

echo "=== 4. ПРОВЕРКА ФАЙЛОВ ДЛЯ СБОРКИ ==="
echo ""
if [ ! -f docker-compose.prod.yml ]; then
    echo "❌ docker-compose.prod.yml не найден"
    exit 1
fi
echo "✓ docker-compose.prod.yml найден"

if [ ! -d web/.next ]; then
    echo "❌ web/.next не найден - нужна сборка Next.js"
    exit 1
fi
echo "✓ web/.next найден"

if [ ! -d web/.next/standalone ]; then
    echo "❌ web/.next/standalone не найден"
    echo "   Нужно пересобрать проект локально и задеплоить"
    exit 1
fi
echo "✓ web/.next/standalone найден"

if [ ! -f web/.next/standalone/server.js ]; then
    echo "❌ web/.next/standalone/server.js не найден"
    echo "   Проверка содержимого standalone:"
    ls -la web/.next/standalone/ | head -10
    exit 1
fi
echo "✓ server.js найден в standalone"

if [ ! -f web/Dockerfile.prod ]; then
    echo "❌ web/Dockerfile.prod не найден"
    exit 1
fi
echo "✓ web/Dockerfile.prod найден"
echo ""

echo "=== 5. ПРОВЕРКА DOCKERFILE.PROD ==="
echo ""
if grep -q "styled-jsx\|pnpm install" web/Dockerfile.prod; then
    echo "✓ Dockerfile.prod содержит установку зависимостей"
else
    echo "⚠️  Dockerfile.prod может не устанавливать зависимости"
    echo "   Проверьте содержимое:"
    head -50 web/Dockerfile.prod
fi
echo ""

echo "=== 6. СБОРКА ОБРАЗА ==="
echo ""
echo "Сборка образа evm-web..."
if docker-compose -f docker-compose.prod.yml build web 2>&1; then
    echo "✓ Образ успешно собран"
else
    echo "❌ Ошибка при сборке образа"
    echo ""
    echo "Попробуем через docker build:"
    cd web || exit 1
    if docker build -f Dockerfile.prod -t evm-web:latest .. 2>&1; then
        echo "✓ Образ собран через docker build"
        cd ..
    else
        echo "❌ Ошибка при сборке через docker build"
        cd ..
        exit 1
    fi
fi
echo ""

echo "=== 7. ЗАПУСК КОНТЕЙНЕРА ==="
echo ""
echo "Запуск web контейнера..."
if docker-compose -f docker-compose.prod.yml up -d web 2>&1; then
    echo "✓ Контейнер запущен"
else
    echo "❌ Ошибка при запуске контейнера"
    exit 1
fi
echo ""

echo "=== 8. ОЖИДАНИЕ ЗАПУСКА ==="
echo ""
echo "Ожидание 10 секунд..."
sleep 10
echo ""

echo "=== 9. ПРОВЕРКА СТАТУСА ==="
echo ""
if docker ps | grep -q evm-web; then
    echo "✓ Web контейнер запущен"
    docker ps | grep evm-web
else
    echo "❌ Web контейнер не запущен"
    echo ""
    echo "Проверка статуса:"
    docker ps -a | grep evm-web
    echo ""
    echo "Логи контейнера:"
    docker logs evm-web --tail 50 2>&1
    exit 1
fi
echo ""

echo "=== 10. ПРОВЕРКА ЛОГОВ ==="
echo ""
echo "Последние 30 строк логов:"
docker logs evm-web --tail 30 2>&1
echo ""

echo "=== 11. ПРОВЕРКА ДОСТУПНОСТИ ==="
echo ""
echo "Проверка порта 3000:"
if ss -tuln 2>/dev/null | grep -q ":3000 " || netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "✓ Порт 3000 слушается"
else
    echo "⚠️  Порт 3000 не слушается (может потребоваться время)"
fi
echo ""

echo "Проверка HTTP ответа:"
sleep 5
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Web контейнер отвечает на HTTP запросы"
else
    echo "⚠️  Web контейнер пока не отвечает (может быть еще запускается)"
    echo "   Попробуйте через минуту: curl http://localhost:3000"
fi
echo ""

echo "=== 12. ПРОВЕРКА ФАЙЛОВ В КОНТЕЙНЕРЕ ==="
echo ""
echo "Проверка server.js:"
if docker exec evm-web test -f /app/server.js 2>/dev/null; then
    echo "✓ server.js найден"
    docker exec evm-web ls -lh /app/server.js 2>/dev/null
else
    echo "❌ server.js НЕ найден"
fi
echo ""

echo "Проверка node_modules:"
if docker exec evm-web test -d /app/node_modules 2>/dev/null; then
    echo "✓ node_modules найден"
    echo "  Количество модулей: $(docker exec evm-web ls /app/node_modules 2>/dev/null | wc -l)"
    
    echo ""
    echo "Проверка styled-jsx:"
    if docker exec evm-web test -d /app/node_modules/styled-jsx 2>/dev/null; then
        echo "✓ styled-jsx найден"
    else
        echo "❌ styled-jsx НЕ найден (это может быть проблемой)"
    fi
else
    echo "❌ node_modules НЕ найден"
fi
echo ""

echo "=== 13. РЕЗЮМЕ ==="
echo ""
if docker ps | grep -q evm-web && curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Web контейнер успешно запущен и работает!"
    echo ""
    echo "Проверьте сайт:"
    echo "  https://cyberelka2077.ru"
else
    echo "⚠️  Web контейнер запущен, но может быть еще не готов"
    echo ""
    echo "Проверьте логи:"
    echo "  docker logs evm-web --tail 50"
    echo ""
    echo "Проверьте доступность:"
    echo "  curl http://localhost:3000"
fi
echo ""


