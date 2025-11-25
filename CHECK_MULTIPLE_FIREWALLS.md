# Проверка множественных Firewall в DigitalOcean

## Проблема

Если порты 80 и 443 заблокированы, несмотря на правильную настройку firewall, возможно есть несколько firewall или конфликт правил.

## Что проверить в DigitalOcean Dashboard

### 1. Проверьте все Firewall

1. Перейдите в **Networking** → **Firewalls**
2. Проверьте **ВСЕ** firewall в списке
3. Для каждого firewall:
   - Откройте вкладку **"Droplets"**
   - Проверьте, не привязан ли ваш Droplet к нескольким firewall
   - Если Droplet привязан к нескольким firewall, это может вызывать конфликты

### 2. Проверьте правила каждого Firewall

Для каждого firewall, к которому привязан ваш Droplet:
- Проверьте вкладку **"Rules"**
- Убедитесь, что правила для портов 80 и 443 имеют:
  - **Sources:** All IPv4, All IPv6
  - **Action:** Allow (не Deny)

### 3. Если есть несколько Firewall

**Вариант 1: Удалите лишние firewall**
- Оставьте только один firewall с правильными правилами
- Удалите Droplet из всех остальных firewall

**Вариант 2: Объедините правила**
- Убедитесь, что во всех firewall правила одинаковые
- Или удалите Droplet из всех firewall, кроме одного

### 4. Проверьте настройки Droplet

1. Перейдите в **Droplets** → выберите ваш Droplet
2. Нажмите **"Settings"** → **"Networking"**
3. Проверьте, нет ли ограничений на уровне Droplet

### 5. Проверьте через DigitalOcean API

Если у вас есть доступ к DigitalOcean API, проверьте все firewall через API.

## Рекомендация

**Лучше всего иметь только один firewall**, привязанный к Droplet, с правильными правилами:
- SSH (порт 22) - All IPv4, All IPv6
- HTTP (порт 80) - All IPv4, All IPv6  
- HTTPS (порт 443) - All IPv4, All IPv6

Если есть другие firewall, удалите Droplet из них или удалите сами firewall.


