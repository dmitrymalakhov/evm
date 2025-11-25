# Настройка Firewall в DigitalOcean

## Проблема
Сайт не открывается по домену, хотя:
- ✅ DNS настроен правильно (A запись указывает на 207.154.207.198)
- ✅ Nginx работает и слушает порты 80 и 443
- ✅ Контейнеры запущены и работают
- ✅ iptables правила добавлены на сервере

**Причина:** Порт 443 (HTTPS) заблокирован на уровне Cloud Firewall DigitalOcean.

## Решение

### Шаг 1: Откройте Cloud Firewall в DigitalOcean

1. Зайдите в [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
2. Перейдите в **Networking** → **Firewalls**
3. Найдите firewall, привязанный к вашему Droplet `207.154.207.198`
   - Если firewall не создан, создайте новый:
     - Нажмите **"Create Firewall"**
     - Назовите его (например, "web-server-firewall")
     - Добавьте ваш Droplet в список

### Шаг 2: Добавьте правила для HTTP и HTTPS

В настройках firewall добавьте **Inbound Rules**:

1. **HTTP (порт 80)**
   - Type: `Custom`
   - Protocol: `TCP`
   - Port Range: `80`
   - Sources: `All IPv4, All IPv6` (или `0.0.0.0/0, ::/0`)
   - Description: "Allow HTTP traffic"

2. **HTTPS (порт 443)**
   - Type: `Custom`
   - Protocol: `TCP`
   - Port Range: `443`
   - Sources: `All IPv4, All IPv6` (или `0.0.0.0/0, ::/0`)
   - Description: "Allow HTTPS traffic"

3. **SSH (порт 22)** - если еще не открыт
   - Type: `SSH`
   - Sources: `All IPv4, All IPv6` (или только ваш IP для безопасности)

### Шаг 3: Сохраните изменения

Нажмите **"Create Firewall"** или **"Save Changes"** если редактируете существующий.

### Шаг 4: Проверка

После применения правил подождите 1-2 минуты и проверьте:

```bash
curl -I https://cyberelka2077.ru
```

Должен вернуться `HTTP/1.1 200 OK`.

## Альтернатива: Использование Load Balancer

Если у вас есть Load Balancer, убедитесь что он настроен на порты 80 и 443.

## Проверка текущих правил

Чтобы проверить, какие правила уже применены:

1. В DigitalOcean Dashboard → Networking → Firewalls
2. Найдите ваш firewall
3. Проверьте вкладку **"Inbound Rules"**

## Важно

- Изменения в firewall применяются почти мгновенно
- Если сайт все еще не открывается, проверьте:
  - Правильность DNS записей (должна быть A запись для `cyberelka2077.ru`)
  - Работает ли сайт по IP: `http://207.154.207.198`
  - Логи Nginx: `ssh root@207.154.207.198 'tail -f /var/log/nginx/error.log'`


