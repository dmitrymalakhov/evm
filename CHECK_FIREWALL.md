# Проверка Cloud Firewall в DigitalOcean

## Проблема
Сайт не открывается по домену даже с чистых устройств, хотя:
- ✅ По IP адресу (207.154.207.198) все работает
- ✅ Nginx настроен правильно
- ✅ Контейнеры работают
- ✅ DNS резолвится правильно

**Вероятная причина:** Порты 80 и 443 заблокированы на уровне **Cloud Firewall** в DigitalOcean.

## Решение

### Шаг 1: Проверьте Cloud Firewall

1. Зайдите в [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
2. Перейдите в **Networking** → **Firewalls**
3. Найдите firewall, привязанный к вашему Droplet `207.154.207.198`
   - Если firewall не создан, это может быть проблемой - порты могут быть заблокированы по умолчанию

### Шаг 2: Создайте или отредактируйте Firewall

**Если firewall не существует:**

1. Нажмите **"Create Firewall"**
2. Назовите его (например, "web-server-firewall")
3. Добавьте **Inbound Rules**:
   - **HTTP (порт 80)**
     - Type: `Custom`
     - Protocol: `TCP`
     - Port Range: `80`
     - Sources: `All IPv4, All IPv6`
   - **HTTPS (порт 443)**
     - Type: `Custom`
     - Protocol: `TCP`
     - Port Range: `443`
     - Sources: `All IPv4, All IPv6`
   - **SSH (порт 22)** - если еще не открыт
     - Type: `SSH`
     - Sources: `All IPv4, All IPv6` (или только ваш IP для безопасности)
4. Добавьте ваш Droplet в список **"Apply to Droplets"**
5. Нажмите **"Create Firewall"**

**Если firewall существует:**

1. Откройте существующий firewall
2. Проверьте вкладку **"Inbound Rules"**
3. Убедитесь что есть правила для портов 80 и 443
4. Если правил нет - добавьте их (см. выше)
5. Сохраните изменения

### Шаг 3: Проверьте привязку к Droplet

1. В настройках firewall найдите раздел **"Apply to Droplets"**
2. Убедитесь что ваш Droplet `207.154.207.198` в списке
3. Если нет - добавьте его

### Шаг 4: Проверка

После применения правил подождите 1-2 минуты и проверьте:

```bash
curl -I https://cyberelka2077.ru
```

Должен вернуться `HTTP/1.1 200 OK`.

## Альтернатива: Проверка через DigitalOcean API

Если у вас есть API токен, можно проверить firewall через API:

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://api.digitalocean.com/v2/firewalls"
```

## Важно

- Изменения в firewall применяются почти мгновенно
- Если сайт все еще не открывается после открытия портов:
  1. Проверьте логи Nginx: `ssh root@207.154.207.198 'tail -f /var/log/nginx/error.log'`
  2. Проверьте статус контейнеров: `ssh root@207.154.207.198 'docker ps'`
  3. Проверьте доступность по IP: `curl -I http://207.154.207.198`


