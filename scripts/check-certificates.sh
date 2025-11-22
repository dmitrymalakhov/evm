#!/bin/bash

# Скрипт для проверки наличия SSL сертификатов
# Использование: ./check-certificates.sh

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

CERT_DIR="cert"

info "Проверка SSL сертификатов в директории $CERT_DIR..."

if [ ! -d "$CERT_DIR" ]; then
    error "Директория $CERT_DIR не найдена"
    exit 1
fi

# Проверка приватного ключа
HAS_PRIVATE_KEY=false
if [ -f "$CERT_DIR/private_key.txt" ]; then
    info "✓ Найден private_key.txt"
    HAS_PRIVATE_KEY=true
elif [ -f "$CERT_DIR/privkey.pem" ]; then
    info "✓ Найден privkey.pem"
    HAS_PRIVATE_KEY=true
else
    error "✗ Приватный ключ не найден (ожидается private_key.txt или privkey.pem)"
fi

# Проверка сертификата
HAS_CERTIFICATE=false
if ls "$CERT_DIR"/www_cyberelka2077_ru_*.crt 1> /dev/null 2>&1; then
    CERT_FILE=$(ls "$CERT_DIR"/www_cyberelka2077_ru_*.crt | head -1)
    info "✓ Найден основной сертификат: $(basename "$CERT_FILE")"
    HAS_CERTIFICATE=true
elif [ -f "$CERT_DIR/certificate.crt" ]; then
    info "✓ Найден certificate.crt"
    HAS_CERTIFICATE=true
elif [ -f "$CERT_DIR/certificate.pem" ]; then
    info "✓ Найден certificate.pem"
    HAS_CERTIFICATE=true
elif [ -f "$CERT_DIR/fullchain.pem" ]; then
    info "✓ Найден fullchain.pem"
    HAS_CERTIFICATE=true
else
    error "✗ Сертификат не найден"
    error "  Ожидается один из:"
    error "    - www_cyberelka2077_ru_*.crt"
    error "    - certificate.crt"
    error "    - certificate.pem"
    error "    - fullchain.pem"
fi

# Проверка цепочки (опционально)
HAS_CHAIN=false
if ls "$CERT_DIR"/intermediate*.crt 1> /dev/null 2>&1; then
    CHAIN_FILE=$(ls "$CERT_DIR"/intermediate*.crt | head -1)
    info "✓ Найден промежуточный сертификат: $(basename "$CHAIN_FILE") (опционально)"
    HAS_CHAIN=true
elif [ -f "$CERT_DIR/chain.pem" ]; then
    info "✓ Найден chain.pem (опционально)"
    HAS_CHAIN=true
elif [ -f "$CERT_DIR/chain.crt" ]; then
    info "✓ Найден chain.crt (опционально)"
    HAS_CHAIN=true
fi

# Проверка корневого сертификата (опционально)
HAS_ROOT=false
if ls "$CERT_DIR"/root*.crt 1> /dev/null 2>&1; then
    ROOT_FILE=$(ls "$CERT_DIR"/root*.crt | head -1)
    info "✓ Найден корневой сертификат: $(basename "$ROOT_FILE") (опционально)"
    HAS_ROOT=true
fi

echo ""
if [ "$HAS_PRIVATE_KEY" = true ] && [ "$HAS_CERTIFICATE" = true ]; then
    info "✓ Все необходимые сертификаты найдены!"
    if [ "$HAS_CHAIN" = false ] && [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        warn "⚠ Цепочка сертификатов не найдена, но это не критично"
        warn "  Если есть проблемы с SSL, добавьте chain.pem или chain.crt"
    fi
    exit 0
else
    error "✗ Не все необходимые сертификаты найдены"
    error ""
    error "Для работы SSL нужны:"
    error "  1. Приватный ключ (private_key.txt или privkey.pem)"
    error "  2. Сертификат (certificate.crt, certificate.pem или fullchain.pem)"
    error ""
    error "Если у вас есть только приватный ключ, вам нужно получить сертификат."
    error "Можно использовать Let's Encrypt:"
    error "  certbot certonly --standalone -d cyberelka2077.ru"
    exit 1
fi

