# Проверка настроек DigitalOcean

## Проблема
Сайт не открывается с внешних устройств, хотя с сервера все работает.

## Что проверить в DigitalOcean Dashboard

### 1. Проверка Cloud Firewall
1. Перейдите в **Networking** → **Firewalls**
2. Откройте ваш firewall `cyberelka2077.ru`
3. Проверьте вкладку **"Droplets"** - убедитесь, что ваш Droplet привязан
4. Проверьте вкладку **"Rules"**:
   - **Inbound Rules** должны содержать:
     - HTTP (порт 80) - All IPv4, All IPv6
     - HTTPS (порт 443) - All IPv4, All IPv6
   - **Outbound Rules** должны разрешать весь трафик

### 2. Проверка настроек Droplet
1. Перейдите в **Droplets** → выберите ваш Droplet
2. Нажмите **"Settings"** → **"Networking"**
3. Проверьте, что:
   - **IPv4** включен и показывает `207.154.207.198`
   - **IPv6** (если используется) настроен правильно
   - **Private Networking** не блокирует трафик

### 3. Проверка Cloud Firewall Tags
1. В настройках Droplet проверьте вкладку **"Tags"**
2. Убедитесь, что нет конфликтующих тегов, которые могут блокировать доступ

### 4. Проверка Load Balancer (если используется)
Если у вас есть Load Balancer:
1. Перейдите в **Networking** → **Load Balancers**
2. Проверьте, что он правильно настроен и не блокирует трафик

### 5. Проверка через DigitalOcean Support
Если все настройки выглядят правильно, но сайт все равно не работает:
1. Откройте тикет в DigitalOcean Support
2. Укажите:
   - IP адрес Droplet: `207.154.207.198`
   - Домен: `cyberelka2077.ru`
   - Проблема: порты 80 и 443 не доступны извне, хотя firewall настроен правильно

## Альтернативная проверка

Попробуйте использовать онлайн-сервисы для проверки доступности:
- https://www.isitdownrightnow.com/cyberelka2077.ru.html
- https://downforeveryoneorjustme.com/cyberelka2077.ru
- https://www.uptrends.com/tools/uptime

Если эти сервисы показывают, что сайт недоступен, проблема точно на стороне DigitalOcean или сервера.


