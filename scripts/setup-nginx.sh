#!/bin/bash

# Скрипт для настройки nginx на сервере
# Использование: ./setup-nginx.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что скрипт запущен от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    error "Пожалуйста, запустите скрипт с правами root или через sudo"
    exit 1
fi

info "Начинаем настройку nginx..."

# Установка nginx, если не установлен
if ! command -v nginx &> /dev/null; then
    info "Установка nginx..."
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        yum install -y nginx
    else
        error "Не удалось определить менеджер пакетов. Установите nginx вручную."
        exit 1
    fi
else
    info "nginx уже установлен"
fi

# Проверка наличия сертификатов
CERT_DIR="/opt/evm/cert"
if [ ! -d "$CERT_DIR" ]; then
    error "Директория с сертификатами не найдена: $CERT_DIR"
    error "Убедитесь, что сертификаты загружены на сервер"
    exit 1
fi

# Проверка наличия Let's Encrypt сертификатов (альтернативный вариант)
LETSENCRYPT_CERT="/etc/letsencrypt/live/cyberelka2077.ru/fullchain.pem"
LETSENCRYPT_KEY="/etc/letsencrypt/live/cyberelka2077.ru/privkey.pem"
USE_LETSENCRYPT=false

if [ -f "$LETSENCRYPT_CERT" ] && [ -f "$LETSENCRYPT_KEY" ]; then
    info "Найдены Let's Encrypt сертификаты, используем их..."
    SSL_DIR="/etc/nginx/ssl/cyberelka2077.ru"
    mkdir -p "$SSL_DIR"
    cp "$LETSENCRYPT_CERT" "$SSL_DIR/fullchain.pem"
    cp "$LETSENCRYPT_KEY" "$SSL_DIR/privkey.pem"
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    info "✓ Let's Encrypt сертификаты скопированы"
    USE_LETSENCRYPT=true
fi

# Копирование сертификатов (если не используются Let's Encrypt)
if [ "$USE_LETSENCRYPT" = false ]; then
    # Создание директории для SSL сертификатов
    SSL_DIR="/etc/nginx/ssl/cyberelka2077.ru"
    info "Создание директории для SSL сертификатов: $SSL_DIR"
    mkdir -p "$SSL_DIR"

    # Копирование сертификатов
    info "Копирование SSL сертификатов..."

    # Копирование приватного ключа
    if [ -f "$CERT_DIR/private_key.txt" ]; then
        # Проверка, зашифрован ли ключ
        if grep -q "BEGIN ENCRYPTED PRIVATE KEY" "$CERT_DIR/private_key.txt" 2>/dev/null; then
            info "Обнаружен зашифрованный приватный ключ, расшифровываем..."
            
            # Получение пароля из переменной окружения или запрос у пользователя
            if [ -z "$CERT_PASSWORD" ]; then
                # Если пароль не задан в переменной окружения, запрашиваем один раз
                if [ -z "$CERT_PASSWORD_PROMPTED" ]; then
                    read -sp "Введите пароль от сертификата: " CERT_PASSWORD
                    echo ""
                    export CERT_PASSWORD_PROMPTED=1
                else
                    error "Пароль от сертификата не задан. Установите переменную CERT_PASSWORD или введите пароль."
                    exit 1
                fi
            fi
            
            # Расшифровка ключа
            # Пробуем разные форматы: сначала PKCS#8, затем традиционный RSA
            DECRYPT_SUCCESS=false
            if echo "$CERT_PASSWORD" | openssl pkcs8 -in "$CERT_DIR/private_key.txt" -out "$SSL_DIR/privkey.pem" -passin stdin -nocrypt 2>/dev/null || \
               echo "$CERT_PASSWORD" | openssl pkcs8 -in "$CERT_DIR/private_key.txt" -out "$SSL_DIR/privkey.pem" -passin stdin 2>/dev/null; then
                DECRYPT_SUCCESS=true
            elif echo "$CERT_PASSWORD" | openssl rsa -in "$CERT_DIR/private_key.txt" -out "$SSL_DIR/privkey.pem" -passin stdin 2>/dev/null; then
                DECRYPT_SUCCESS=true
            fi
            
            if [ "$DECRYPT_SUCCESS" = true ]; then
                chmod 600 "$SSL_DIR/privkey.pem"
                info "✓ Приватный ключ расшифрован и скопирован"
                
                # Опционально: сохраняем расшифрованный ключ обратно в cert/ для будущего использования
                # (только если исходный ключ зашифрован, чтобы не перезаписывать незашифрованный)
                if [ -w "$CERT_DIR" ]; then
                    # Создаем резервную копию зашифрованного ключа
                    if [ ! -f "$CERT_DIR/private_key.txt.encrypted.backup" ]; then
                        cp "$CERT_DIR/private_key.txt" "$CERT_DIR/private_key.txt.encrypted.backup" 2>/dev/null || true
                    fi
                    # Сохраняем расшифрованную версию (опционально, можно закомментировать для безопасности)
                    # cp "$SSL_DIR/privkey.pem" "$CERT_DIR/private_key.txt" 2>/dev/null || true
                    # chmod 600 "$CERT_DIR/private_key.txt" 2>/dev/null || true
                fi
            else
                error "Не удалось расшифровать приватный ключ. Проверьте пароль и формат ключа."
                error "Попробуйте расшифровать ключ вручную:"
                error "  openssl rsa -in cert/private_key.txt -out cert/private_key_decrypted.txt"
                exit 1
            fi
        else
            # Ключ не зашифрован, просто копируем
            cp "$CERT_DIR/private_key.txt" "$SSL_DIR/privkey.pem"
            chmod 600 "$SSL_DIR/privkey.pem"
            info "✓ Приватный ключ скопирован"
        fi
    else
        error "Приватный ключ не найден: $CERT_DIR/private_key.txt"
        exit 1
    fi

    # Поиск основного сертификата (www_cyberelka2077_ru_*.crt или certificate.*)
    CERT_FILE=""
    if ls "$CERT_DIR"/www_cyberelka2077_ru_*.crt 1> /dev/null 2>&1; then
        CERT_FILE=$(ls "$CERT_DIR"/www_cyberelka2077_ru_*.crt | head -1)
        info "✓ Найден основной сертификат: $(basename "$CERT_FILE")"
    elif [ -f "$CERT_DIR/certificate.crt" ]; then
        CERT_FILE="$CERT_DIR/certificate.crt"
        info "✓ Найден сертификат: certificate.crt"
    elif [ -f "$CERT_DIR/certificate.pem" ]; then
        CERT_FILE="$CERT_DIR/certificate.pem"
        info "✓ Найден сертификат: certificate.pem"
    elif [ -f "$CERT_DIR/fullchain.pem" ]; then
        cp "$CERT_DIR/fullchain.pem" "$SSL_DIR/fullchain.pem"
        chmod 644 "$SSL_DIR/fullchain.pem"
        info "✓ Fullchain скопирован"
        CERT_FILE="SKIP"
    fi

    if [ -z "$CERT_FILE" ] || [ "$CERT_FILE" != "SKIP" ]; then
        if [ -z "$CERT_FILE" ]; then
            error "Сертификат не найден. Ожидаются файлы:"
            error "  - www_cyberelka2077_ru_*.crt"
            error "  - certificate.crt или certificate.pem"
            error "  - fullchain.pem (альтернатива)"
            exit 1
        fi

        # Копируем основной сертификат
        cp "$CERT_FILE" "$SSL_DIR/certificate.pem"
        chmod 644 "$SSL_DIR/certificate.pem"
        info "✓ Основной сертификат скопирован"

        # Поиск промежуточного сертификата
        INTERMEDIATE_FILE=""
        if ls "$CERT_DIR"/intermediate*.crt 1> /dev/null 2>&1; then
            INTERMEDIATE_FILE=$(ls "$CERT_DIR"/intermediate*.crt | head -1)
            info "✓ Найден промежуточный сертификат: $(basename "$INTERMEDIATE_FILE")"
        elif [ -f "$CERT_DIR/chain.pem" ]; then
            INTERMEDIATE_FILE="$CERT_DIR/chain.pem"
        elif [ -f "$CERT_DIR/chain.crt" ]; then
            INTERMEDIATE_FILE="$CERT_DIR/chain.crt"
        fi

        # Поиск корневого сертификата
        ROOT_FILE=""
        if ls "$CERT_DIR"/root*.crt 1> /dev/null 2>&1; then
            ROOT_FILE=$(ls "$CERT_DIR"/root*.crt | head -1)
            info "✓ Найден корневой сертификат: $(basename "$ROOT_FILE")"
        fi

        # Создание fullchain.pem: certificate + intermediate + root
        if [ -n "$INTERMEDIATE_FILE" ] || [ -n "$ROOT_FILE" ]; then
            cat "$SSL_DIR/certificate.pem" > "$SSL_DIR/fullchain.pem"
            if [ -n "$INTERMEDIATE_FILE" ]; then
                cat "$INTERMEDIATE_FILE" >> "$SSL_DIR/fullchain.pem"
            fi
            if [ -n "$ROOT_FILE" ]; then
                cat "$ROOT_FILE" >> "$SSL_DIR/fullchain.pem"
            fi
            chmod 644 "$SSL_DIR/fullchain.pem"
            info "✓ Fullchain создан (certificate + intermediate + root)"
        else
            # Если нет промежуточных сертификатов, используем только основной
            cp "$SSL_DIR/certificate.pem" "$SSL_DIR/fullchain.pem"
            chmod 644 "$SSL_DIR/fullchain.pem"
            warn "Промежуточные сертификаты не найдены, используется только основной сертификат"
        fi
    fi
fi

# Копирование конфигурации nginx
NGINX_CONF="/etc/nginx/sites-available/cyberelka2077.ru.conf"
if [ -f "/opt/evm/nginx/cyberelka2077.ru.conf" ]; then
    cp "/opt/evm/nginx/cyberelka2077.ru.conf" "$NGINX_CONF"
    info "✓ Конфигурация nginx скопирована"
else
    error "Конфигурация nginx не найдена: /opt/evm/nginx/cyberelka2077.ru.conf"
    exit 1
fi

# Создание символической ссылки, если используется sites-enabled
if [ -d "/etc/nginx/sites-enabled" ]; then
    if [ -L "/etc/nginx/sites-enabled/cyberelka2077.ru.conf" ]; then
        rm "/etc/nginx/sites-enabled/cyberelka2077.ru.conf"
    fi
    ln -s "$NGINX_CONF" "/etc/nginx/sites-enabled/cyberelka2077.ru.conf"
    info "✓ Символическая ссылка создана"
fi

# Проверка конфигурации nginx
info "Проверка конфигурации nginx..."
if nginx -t; then
    info "✓ Конфигурация nginx валидна"
else
    error "Ошибка в конфигурации nginx"
    exit 1
fi

# Перезапуск nginx
info "Перезапуск nginx..."
systemctl restart nginx || service nginx restart

# Проверка статуса nginx
if systemctl is-active --quiet nginx || service nginx status > /dev/null 2>&1; then
    info "✓ nginx успешно запущен"
else
    error "Ошибка при запуске nginx"
    exit 1
fi

# Включение автозапуска nginx
if command -v systemctl &> /dev/null; then
    systemctl enable nginx
    info "✓ Автозапуск nginx включен"
fi

info ""
info "Настройка nginx завершена успешно!"
info ""
info "Проверьте доступность сайта:"
info "  https://cyberelka2077.ru"
info ""
info "Полезные команды:"
info "  Проверка статуса: systemctl status nginx"
info "  Просмотр логов: tail -f /var/log/nginx/cyberelka2077.ru.error.log"
info "  Перезапуск: systemctl restart nginx"

