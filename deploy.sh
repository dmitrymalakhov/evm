#!/bin/bash

# Скрипт деплоя на удаленный сервер
# Использование: ./deploy.sh <server_ip> [user] [ssh_port] [remote_path] [git_branch] [git_repo_url]

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка параметров
if [ -z "$1" ]; then
    error "Не указан IP адрес сервера"
    echo "Использование: $0 <server_ip> [user] [ssh_port] [remote_path] [git_branch] [git_repo_url]"
    echo ""
    echo "Параметры:"
    echo "  server_ip    - IP адрес или домен удаленного сервера (обязательно)"
    echo "  user         - Пользователь для SSH подключения (по умолчанию: root)"
    echo "  ssh_port     - Порт SSH (по умолчанию: 22)"
    echo "  remote_path  - Путь на сервере для деплоя (по умолчанию: /opt/evm)"
    echo "  git_branch   - Ветка Git для деплоя (по умолчанию: main)"
    echo "  git_repo_url - URL репозитория для клонирования (опционально, если репозиторий не существует)"
    echo ""
    echo "Примеры:"
    echo "  ./deploy.sh 192.168.1.100"
    echo "  ./deploy.sh example.com ubuntu 22 /home/ubuntu/evm main"
    echo "  ./deploy.sh 192.168.1.100 root 22 /opt/evm main https://github.com/user/repo.git"
    exit 1
fi

SERVER_IP="$1"
SSH_USER="${2:-root}"
SSH_PORT="${3:-22}"
REMOTE_PATH="${4:-/opt/evm}"
GIT_BRANCH="${5:-main}"
GIT_REPO_URL="$6"

# Определение SSH опций
SSH_OPTS="-p $SSH_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no"
SCP_OPTS="-P $SSH_PORT -o StrictHostKeyChecking=no"

info "Начинаем деплой на сервер $SERVER_IP"
info "Пользователь: $SSH_USER"
info "Порт SSH: $SSH_PORT"
info "Путь на сервере: $REMOTE_PATH"
info "Ветка Git: $GIT_BRANCH"

# Проверка SSH подключения
info "Проверка SSH подключения..."
if ! ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    error "Не удалось подключиться к серверу по SSH"
    error "Убедитесь, что:"
    error "  1. Сервер доступен по сети"
    error "  2. SSH сервис запущен на сервере"
    error "  3. У вас есть доступ по SSH ключу или паролю"
    error "  4. Правильно указаны пользователь и порт"
    exit 1
fi
info "SSH подключение установлено"

# Проверка наличия Docker и Docker Compose на сервере
info "Проверка наличия Docker и Docker Compose..."
if ! ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "command -v docker > /dev/null 2>&1 && command -v docker-compose > /dev/null 2>&1"; then
    error "Docker или Docker Compose не установлены на сервере"
    warn "Установите Docker и Docker Compose на сервере перед деплоем"
    warn "Инструкции: https://docs.docker.com/get-docker/"
    exit 1
fi
info "Docker и Docker Compose установлены"

# Создание директории на сервере, если не существует
info "Создание директории $REMOTE_PATH на сервере..."
ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "mkdir -p $REMOTE_PATH"

# Проверка, существует ли репозиторий на сервере
info "Проверка репозитория на сервере..."
if ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "[ -d $REMOTE_PATH/.git ]"; then
    info "Репозиторий существует, обновляем..."
    ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $REMOTE_PATH && git fetch origin && git checkout $GIT_BRANCH && git pull origin $GIT_BRANCH"
else
    if [ -n "$GIT_REPO_URL" ]; then
        info "Репозиторий не найден, клонируем из $GIT_REPO_URL..."
        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $(dirname $REMOTE_PATH) && git clone -b $GIT_BRANCH $GIT_REPO_URL $(basename $REMOTE_PATH) || git clone $GIT_REPO_URL $(basename $REMOTE_PATH)"
        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $REMOTE_PATH && git checkout $GIT_BRANCH 2>/dev/null || true"
    else
        # Попытка получить URL репозитория из локального git
        LOCAL_REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
        if [ -n "$LOCAL_REPO_URL" ]; then
            info "Репозиторий не найден, клонируем из $LOCAL_REPO_URL..."
            ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $(dirname $REMOTE_PATH) && git clone -b $GIT_BRANCH $LOCAL_REPO_URL $(basename $REMOTE_PATH) || git clone $LOCAL_REPO_URL $(basename $REMOTE_PATH)"
            ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $REMOTE_PATH && git checkout $GIT_BRANCH 2>/dev/null || true"
        else
            warn "Репозиторий не найден и URL не указан."
            warn "Необходимо вручную клонировать репозиторий на сервер:"
            warn "  ssh $SSH_USER@$SERVER_IP"
            warn "  cd $(dirname $REMOTE_PATH)"
            warn "  git clone <repository-url> $(basename $REMOTE_PATH)"
            warn "  cd $REMOTE_PATH"
            warn ""
            warn "Или укажите URL репозитория как 6-й параметр скрипта"
            error "Пожалуйста, клонируйте репозиторий вручную и запустите скрипт снова"
            exit 1
        fi
    fi
fi

# Копирование .env файла, если он существует локально
if [ -f ".env" ]; then
    info "Копирование .env файла на сервер..."
    scp $SCP_OPTS .env "$SSH_USER@$SERVER_IP:$REMOTE_PATH/.env"
else
    warn ".env файл не найден локально. Убедитесь, что он существует на сервере"
fi

# Остановка существующих контейнеров
# ВАЖНО: Используем 'docker-compose down' БЕЗ флага -v, чтобы НЕ удалять volumes
# Volumes (api_data, api_uploads) сохраняют базу данных и загруженные файлы
info "Остановка существующих контейнеров (volumes сохраняются)..."
ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $REMOTE_PATH && docker-compose down || true"

# Очистка старых образов (опционально, для экономии места)
# ВАЖНО: Используем 'docker system prune -f' БЕЗ флага --volumes, чтобы НЕ удалять volumes
info "Очистка неиспользуемых Docker образов (volumes сохраняются)..."
ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "docker system prune -f || true"

# Сборка и запуск контейнеров
info "Сборка и запуск контейнеров..."
ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $REMOTE_PATH && docker-compose up -d --build"

# Ожидание запуска сервисов
info "Ожидание запуска сервисов (30 секунд)..."
sleep 30

# Проверка статуса контейнеров
info "Проверка статуса контейнеров..."
ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "cd $REMOTE_PATH && docker-compose ps"

# Проверка health check API
info "Проверка health check API..."
API_HEALTH=$(ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health 2>/dev/null || echo '000'")
if [ "$API_HEALTH" = "200" ]; then
    info "API health check успешен"
else
    warn "API health check вернул код: $API_HEALTH"
    warn "Проверьте логи: ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose logs api'"
fi

# Проверка Web приложения
info "Проверка Web приложения..."
WEB_HEALTH=$(ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo '000'")
if [ "$WEB_HEALTH" = "200" ]; then
    info "Web приложение доступно"
else
    warn "Web приложение вернуло код: $WEB_HEALTH"
    warn "Проверьте логи: ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose logs web'"
fi

info "Деплой завершен!"
info "Сервисы доступны по адресам:"
info "  - Web: http://$SERVER_IP:3000"
info "  - API: http://$SERVER_IP:4000"
info "  - API Health: http://$SERVER_IP:4000/health"
info ""
info "Полезные команды:"
info "  Просмотр логов:"
info "    ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose logs -f'"
info "  Просмотр логов конкретного сервиса:"
info "    ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose logs -f api'"
info "    ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose logs -f web'"
info "    ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose logs -f telegram-bot'"
info "  Перезапуск сервисов:"
info "    ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose restart'"
info "  Остановка сервисов (volumes сохраняются):"
info "    ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_PATH && docker-compose down'"
info "  ВНИМАНИЕ: Использование 'docker-compose down -v' удалит базу данных!"

