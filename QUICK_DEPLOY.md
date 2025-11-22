# Быстрый деплой на сервер 207.154.207.198

## Подготовка

1. **Проверьте сертификаты:**
   ```bash
   ./scripts/check-certificates.sh
   ```
   Должно показать, что все сертификаты найдены ✓

2. **Создайте/проверьте файл `.env`** в корне проекта:
   ```env
   # API Configuration
   API_PORT=4000
   API_BASE_URL=http://api:4000

   # Web Configuration
   WEB_PORT=3000
   NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api

   # CORS Configuration
   CORS_ORIGIN=https://cyberelka2077.ru

   # Telegram Bot Configuration
   BOT_TOKEN=8590310304:AAGoQkWA8YwXaFLVEBvumiqnhnaluH_l4ho
   ```

## Запуск деплоя

```bash
./deploy.sh 207.154.207.198
```

Или с указанием пользователя (если не root):
```bash
./deploy.sh 207.154.207.198 root
```

## Что произойдет

1. ✅ Проверка SSH подключения к серверу
2. ✅ Проверка Docker на сервере
3. ✅ Обновление кода из Git
4. ✅ Загрузка `.env` файла
5. ✅ Загрузка SSL сертификатов
6. ✅ Загрузка конфигурации nginx
7. ✅ Сборка и запуск Docker контейнеров (API, Web, Telegram Bot)
8. ✅ Автоматическая настройка nginx с SSL

## После деплоя

Проверьте доступность:
- https://cyberelka2077.ru - веб-портал
- https://cyberelka2077.ru/api/health - API health check

## Полезные команды

```bash
# Просмотр логов
ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs -f"

# Проверка статуса контейнеров
ssh root@207.154.207.198 "cd /opt/evm && docker-compose ps"

# Проверка nginx
ssh root@207.154.207.198 "systemctl status nginx"
```

## Если что-то пошло не так

См. подробную инструкцию в [DEPLOY.md](./DEPLOY.md)

