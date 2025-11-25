# Чеклист перед деплоем

## ✅ Проверка перед запуском деплоя

### 1. Сертификаты SSL
```bash
./scripts/check-certificates.sh
```
Должно показать: ✓ Все необходимые сертификаты найдены!

### 2. Файл .env
Проверьте, что файл `.env` содержит:
- ✅ `BOT_TOKEN=8590310304:AAGoQkWA8YwXaFLVEBvumiqnhnaluH_l4ho`
- ✅ `NEXT_PUBLIC_API_URL=https://cyberelka2077.ru/api`
- ✅ `CORS_ORIGIN=https://cyberelka2077.ru`

### 3. DNS настройки
Убедитесь, что DNS записи настроены:
- `cyberelka2077.ru` → `207.154.207.198`
- `www.cyberelka2077.ru` → `207.154.207.198`

Проверить можно:
```bash
dig cyberelka2077.ru
nslookup cyberelka2077.ru
```

### 4. SSH доступ
Проверьте доступ к серверу:
```bash
ssh root@207.154.207.198 "echo 'Connection OK'"
```

### 5. Docker на сервере
Убедитесь, что Docker установлен:
```bash
ssh root@207.154.207.198 "docker --version && docker-compose --version"
```

## 🚀 Запуск деплоя

```bash
./deploy.sh 207.154.207.198
```

## ✅ Проверка после деплоя

1. **Проверка контейнеров:**
   ```bash
   ssh root@207.154.207.198 "cd /opt/evm && docker-compose ps"
   ```
   Все должны быть в статусе `Up`

2. **Проверка логов:**
   ```bash
   ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs --tail=50"
   ```

3. **Проверка доступности:**
   - https://cyberelka2077.ru - веб-портал
   - https://cyberelka2077.ru/api/health - API health check

4. **Проверка nginx:**
   ```bash
   ssh root@207.154.207.198 "systemctl status nginx"
   ssh root@207.154.207.198 "nginx -t"
   ```

5. **Проверка Telegram бота:**
   ```bash
   ssh root@207.154.207.198 "cd /opt/evm && docker-compose logs telegram-bot --tail=20"
   ```

## 📝 Текущие настройки

- **Сервер:** 207.154.207.198
- **Домен:** cyberelka2077.ru
- **Telegram Bot Token:** 8590310304:AAGoQkWA8YwXaFLVEBvumiqnhnaluH_l4ho
- **API порт:** 4000
- **Web порт:** 3000





