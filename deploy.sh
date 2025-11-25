#!/bin/bash

# Функция для отображения помощи
show_help() {
    echo "Usage: $0 [--api] [--web] [--telegram-bot] [--ip <IP_ADDRESS>] [--no-pause]"
    echo
    echo "Options:"
    echo "  --api           Deploy the api service"
    echo "  --web           Deploy the web service"
    echo "  --telegram-bot  Deploy the telegram-bot service"
    echo "  --ip <IP_ADDRESS> Custom IP address for deployment"
    echo "  --no-pause      Skip interactive pause before SSH operations"
    echo "  --verbose       Enable verbose SSH output for debugging"
    exit 1
}

# Проверка аргументов командной строки
DEPLOY_API=false
DEPLOY_WEB=false
DEPLOY_TELEGRAM_BOT=false
CUSTOM_IP="207.154.207.198"  # Дефолтный IP
NO_PAUSE=false
SSH_VERBOSE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
        DEPLOY_API=true
        shift
        ;;
        --web)
        DEPLOY_WEB=true
        shift
        ;;
        --telegram-bot)
        DEPLOY_TELEGRAM_BOT=true
        shift
        ;;
        --ip)
        if [[ -n "$2" && "$2" != --* ]]; then
            CUSTOM_IP="$2"
            shift 2
        else
            echo "Error: IP address must be provided after --ip"
            exit 1
        fi
        ;;
        --no-pause)
        NO_PAUSE=true
        shift
        ;;
        --verbose)
        SSH_VERBOSE="-v"
        shift
        ;;
        *)
        show_help
        ;;
    esac
done

# Проверка, что хотя бы один проект выбран для деплоя
if [ "$DEPLOY_API" = false ] && [ "$DEPLOY_WEB" = false ] && [ "$DEPLOY_TELEGRAM_BOT" = false ]; then
    show_help
fi

echo "Starting deployment with local build and Docker..."

cd "$(dirname "$0")" || { echo "Failed to change directory"; exit 1; }

# Проверка наличия необходимых инструментов локально
echo "Checking local build tools..."

if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found. Please install pnpm first."
    exit 1
fi
echo "✓ pnpm found: $(pnpm --version)"

if ! command -v docker &> /dev/null; then
    echo "Error: docker not found. Please install Docker first."
    exit 1
fi
echo "✓ docker found: $(docker --version)"

# Очистка и создание dist директории
rm -rf dist
mkdir -p dist

# Локальная сборка API
if [ "$DEPLOY_API" = true ]; then
    echo ""
    echo "=== Building API locally ==="
    cd api || { echo "Failed to enter api directory"; exit 1; }
    
    echo "Installing dependencies..."
    pnpm install --frozen-lockfile || { echo "Failed to install API dependencies"; exit 1; }
    
    echo "Building API..."
    pnpm run build || { echo "Failed to build API"; exit 1; }
    
    echo "Preparing API for deployment..."
    mkdir -p ../dist/api
    
    # Копируем собранные файлы и необходимые конфигурации
    cp -r dist ../dist/api/dist 2>/dev/null || { echo "Error: API dist directory not found after build"; exit 1; }
    cp package.json ../dist/api/
    cp pnpm-lock.yaml ../dist/api/
    cp pnpm-workspace.yaml ../dist/api/ 2>/dev/null || true
    cp -r drizzle ../dist/api/ 2>/dev/null || true
    cp Dockerfile.prod ../dist/api/Dockerfile.prod 2>/dev/null || cp ../api/Dockerfile.prod ../dist/api/Dockerfile.prod
    
    echo "✓ API built and prepared"
    cd ..
fi

# Локальная сборка Web
if [ "$DEPLOY_WEB" = true ]; then
    echo ""
    echo "=== Building Web locally ==="
    cd web || { echo "Failed to enter web directory"; exit 1; }
    
    echo "Installing dependencies..."
    pnpm install --frozen-lockfile || { echo "Failed to install Web dependencies"; exit 1; }
    
    # Load NEXT_PUBLIC_API_URL from .env if it exists
    # For production, default to https://cyberelka2077.ru/api if not set
    if [ -f ../.env ]; then
        export $(grep -E '^NEXT_PUBLIC_API_URL=' ../.env | xargs)
        echo "Using NEXT_PUBLIC_API_URL from .env: ${NEXT_PUBLIC_API_URL:-not set}"
    fi
    
    # Set default for production if not set
    if [ -z "$NEXT_PUBLIC_API_URL" ]; then
        NEXT_PUBLIC_API_URL="https://cyberelka2077.ru/api"
        echo "⚠️  NEXT_PUBLIC_API_URL not set, using default for production: $NEXT_PUBLIC_API_URL"
    fi
    
    echo "Building Web (Next.js) with NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL..."
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL pnpm run build || { echo "Failed to build Web"; exit 1; }
    
    echo "Preparing Web for deployment..."
    mkdir -p ../dist/web
    
    # Копируем собранные файлы Next.js
    if [ ! -d ".next" ]; then
        echo "Error: .next directory not found after build"
        exit 1
    fi
    
    if [ ! -d ".next/standalone" ]; then
        echo "Error: .next/standalone directory not found after build. Make sure next.config.ts has output: 'standalone'"
        exit 1
    fi
    
    # Use cp -a to preserve symlinks and attributes (important for Next.js standalone)
    cp -a .next ../dist/web/.next
    cp package.json ../dist/web/
    cp pnpm-lock.yaml ../dist/web/
    cp pnpm-workspace.yaml ../dist/web/ 2>/dev/null || true
    cp -r public ../dist/web/public 2>/dev/null || true
    cp Dockerfile.prod ../dist/web/Dockerfile.prod 2>/dev/null || cp ../web/Dockerfile.prod ../dist/web/Dockerfile.prod
    
    echo "✓ Web built and prepared"
    cd ..
fi

# Локальная сборка Telegram Bot
if [ "$DEPLOY_TELEGRAM_BOT" = true ]; then
    echo ""
    echo "=== Building Telegram Bot locally ==="
    cd telegram-bot || { echo "Failed to enter telegram-bot directory"; exit 1; }
    
    echo "Installing dependencies..."
    pnpm install --frozen-lockfile || { echo "Failed to install Telegram Bot dependencies"; exit 1; }
    
    echo "Building Telegram Bot..."
    pnpm run build || { echo "Failed to build Telegram Bot"; exit 1; }
    
    echo "Preparing Telegram Bot for deployment..."
    mkdir -p ../dist/telegram-bot
    
    # Копируем собранные файлы
    cp -r dist ../dist/telegram-bot/dist 2>/dev/null || { echo "Error: Telegram Bot dist directory not found after build"; exit 1; }
    cp package.json ../dist/telegram-bot/
    cp pnpm-lock.yaml ../dist/telegram-bot/
    cp Dockerfile.prod ../dist/telegram-bot/Dockerfile.prod 2>/dev/null || cp ../telegram-bot/Dockerfile.prod ../dist/telegram-bot/Dockerfile.prod
    
    echo "✓ Telegram Bot built and prepared"
    cd ..
fi

# Копируем docker-compose.prod.yml
if [ -f docker-compose.prod.yml ]; then
    cp docker-compose.prod.yml dist/
    echo "✓ docker-compose.prod.yml copied"
fi

# Проверка содержимого dist перед архивированием
echo ""
echo "Contents of dist directory:"
ls -la dist/
if [ "$DEPLOY_API" = true ]; then
    echo "API directory contents:"
    ls -la dist/api/ 2>/dev/null || echo "API directory not found"
fi
if [ "$DEPLOY_WEB" = true ]; then
    echo "Web directory contents:"
    ls -la dist/web/ 2>/dev/null || echo "Web directory not found"
fi
if [ "$DEPLOY_TELEGRAM_BOT" = true ]; then
    echo "Telegram-bot directory contents:"
    ls -la dist/telegram-bot/ 2>/dev/null || echo "Telegram-bot directory not found"
fi

# Создание архива
echo ""
echo "Creating archive..."
tar -czvf evm-source.tar -C ./dist .

# Проверка размера архива
echo "Archive created. Size:"
ls -lh evm-source.tar

# Копирование архива на удаленный сервер
echo ""
echo "Копирование архива на сервер..."
echo "Используется IP: $CUSTOM_IP"
echo "Размер архива: $(ls -lh evm-source.tar | awk '{print $5}')"
echo ""

# Настройка SSH для переиспользования соединений
SSH_CONTROL_DIR="$HOME/.ssh/control"
mkdir -p "$SSH_CONTROL_DIR"
SSH_CONTROL_PATH="$SSH_CONTROL_DIR/%r@%h:%p"
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$SSH_CONTROL_PATH -o ControlPersist=300 -o StrictHostKeyChecking=accept-new"

# Проверка и автоматическая загрузка SSH ключа
echo ""
echo "=== Настройка SSH соединения ==="
echo ""

# Проверяем, запущен ли SSH агент
if [ -z "$SSH_AUTH_SOCK" ]; then
    echo "⚠️  SSH агент не запущен, пытаемся запустить..."
    eval "$(ssh-agent -s)" > /dev/null 2>&1
fi

# Проверяем, загружен ли ключ
KEY_LOADED=false
if ssh-add -l &>/dev/null; then
    echo "✓ SSH ключ уже загружен в агент"
    KEY_LOADED=true
else
    echo "Попытка автоматически загрузить SSH ключ..."
    
    # Пробуем найти и загрузить ключ
    SSH_KEYS=(
        "$HOME/.ssh/id_rsa"
        "$HOME/.ssh/id_ed25519"
        "$HOME/.ssh/id_ecdsa"
        "$HOME/.ssh/id_dsa"
    )
    
    for key in "${SSH_KEYS[@]}"; do
        if [ -f "$key" ]; then
            echo "Найден ключ: $key"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "⚠️  ВВЕДИТЕ ПАРОЛЬ ОТ SSH КЛЮЧА ОДИН РАЗ"
            echo "   (После этого пароль больше не потребуется)"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            if ssh-add "$key" 2>/dev/null; then
                echo "✓ Ключ успешно загружен в SSH агент"
                KEY_LOADED=true
                break
            else
                echo "⚠️  Не удалось загрузить ключ $key (возможно, неправильный пароль)"
            fi
        fi
    done
    
    if [ "$KEY_LOADED" = false ]; then
        echo ""
        echo "❌ Не удалось автоматически загрузить SSH ключ"
        echo ""
        echo "Попробуйте вручную:"
        echo "  ssh-add ~/.ssh/id_rsa"
        echo ""
        echo "Или укажите путь к ключу:"
        echo "  ssh-add /path/to/your/key"
        echo ""
        echo "После этого запустите скрипт снова."
        exit 1
    fi
fi

# Проверяем соединение с использованием ControlMaster
echo ""
echo "Тестирование SSH соединения с переиспользованием..."
if ssh $SSH_OPTS -o ConnectTimeout=10 root@$CUSTOM_IP "echo 'SSH connection successful'" 2>&1; then
    echo "✓ SSH соединение установлено и будет переиспользоваться"
else
    SSH_EXIT_CODE=$?
    echo ""
    echo "❌ Не удалось подключиться к серверу (exit code: $SSH_EXIT_CODE)"
    echo ""
    echo "Устранение неполадок:"
    echo "   1. Проверьте соединение вручную: ssh root@$CUSTOM_IP"
    echo "   2. Проверьте доступность сервера: ping $CUSTOM_IP"
    echo "   3. Убедитесь, что ключ загружен: ssh-add -l"
    exit 1
fi

# Убрано блокирующее ожидание - используйте --no-pause для автоматического режима
if [ "$NO_PAUSE" = false ]; then
    echo ""
    echo "Продолжаем деплой (используйте --no-pause для автоматического режима)..."
fi

echo ""
echo "=== Создание директории на сервере ==="
ssh $SSH_OPTS root@$CUSTOM_IP "mkdir -p /root/source && echo 'Directory ready'" || { 
    echo "❌ Не удалось создать директорию на сервере"
    exit 1
}

echo ""
echo "=== Копирование архива на сервер ==="
echo "Используется переиспользование SSH соединения - пароль не потребуется"
scp $SSH_OPTS evm-source.tar root@$CUSTOM_IP:/root/source/evm-source.tar || { 
    echo "❌ Не удалось скопировать файл на сервер"
    exit 1
}

# Проверка, что файл скопировался
echo ""
echo "Проверка архива на сервере..."
ssh $SSH_OPTS root@$CUSTOM_IP "ls -lh /root/source/evm-source.tar" || { 
    echo "❌ Архив не найден на сервере"
    exit 1
}

# Загрузка .env файла, если он существует
if [ -f .env ]; then
    echo ""
    echo "Загрузка .env файла..."
    ssh $SSH_OPTS root@$CUSTOM_IP "mkdir -p /root/evm" || true
    scp $SSH_OPTS .env root@$CUSTOM_IP:/root/evm/.env || {
        echo "⚠️  Предупреждение: Не удалось загрузить .env файл. Возможно, нужно загрузить вручную."
    }
fi

# Вход на удаленный сервер и деплой
echo ""
echo "=========================================="
echo "Деплой на сервере с Docker..."
echo "Используется переиспользование SSH соединения"
echo "=========================================="
echo ""
ssh $SSH_OPTS root@$CUSTOM_IP bash << DEPLOY_SCRIPT
  set -e
  
  echo "Checking required tools on server..."
  
  # Проверка Docker
  if ! command -v docker &> /dev/null; then
    echo "Error: Docker not found on server. Please install Docker first."
    exit 1
  fi
  echo "✓ Docker found: \$(docker --version)"
  
  # Проверка Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose not found on server. Please install Docker Compose first."
    exit 1
  fi
  echo "✓ Docker Compose found"
  
  mkdir -p /root/evm
  mkdir -p /root/source
  mkdir -p /root/evm/logs

  cd /root/evm

  echo "Extracting archive..."
  tar -xzvf /root/source/evm-source.tar -C /root/evm

  echo "Verifying extracted files..."
  echo "Contents of /root/evm:"
  ls -la /root/evm

  echo "Removing archive..."
  rm -f /root/source/evm-source.tar

  # Загружаем переменные окружения из .env, если он есть
  if [ -f /root/evm/.env ]; then
    echo "Loading environment variables from .env"
    set -a
    source /root/evm/.env
    set +a
  fi

  # Останавливаем существующие контейнеры
  echo ""
  echo "=== Stopping existing containers ==="
  cd /root/evm
  if [ -f docker-compose.prod.yml ]; then
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || docker compose -f docker-compose.prod.yml down 2>/dev/null || true
  fi

  # Сборка и запуск контейнеров
  echo ""
  echo "=== Building and starting Docker containers ==="
  cd /root/evm
  
  if [ ! -f docker-compose.prod.yml ]; then
    echo "❌ docker-compose.prod.yml not found!"
    exit 1
  fi

  # Определяем команду docker compose (может быть docker-compose или docker compose)
  DOCKER_COMPOSE_CMD="docker-compose"
  if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
  fi

  # Собираем только нужные сервисы
  BUILD_SERVICES=()
  if [ "$DEPLOY_API" = true ]; then
    BUILD_SERVICES+=("api")
  fi
  if [ "$DEPLOY_WEB" = true ]; then
    BUILD_SERVICES+=("web")
  fi
  if [ "$DEPLOY_TELEGRAM_BOT" = true ]; then
    BUILD_SERVICES+=("telegram-bot")
  fi

  if [ \${#BUILD_SERVICES[@]} -eq 0 ]; then
    echo "No services to build"
    exit 1
  fi

  echo "Building Docker images for: \${BUILD_SERVICES[*]}"
  \$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build "\${BUILD_SERVICES[@]}" || { 
    echo "Failed to build Docker images"; 
    exit 1; 
  }

  echo "Starting Docker containers..."
  \$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d "\${BUILD_SERVICES[@]}" || { 
    echo "Failed to start Docker containers"; 
    exit 1; 
  }

  echo ""
  echo "=== Docker containers status ==="
  \$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps
  
  echo ""
  echo "=== Docker logs (last 20 lines) ==="
  \$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs --tail=20
  
  echo ""
  echo "Deployment completed on server"
  echo "Final contents of /root/evm:"
  ls -la /root/evm
DEPLOY_SCRIPT

# Отобразить сообщение о завершении
echo ""
echo "########################################"
echo "#                                      #"
echo "#         Deployment finished!         #"
echo "#                                      #"
echo "########################################"
echo ""
echo "Для проверки статуса контейнеров:"
echo "  ssh $SSH_OPTS root@$CUSTOM_IP 'cd /root/evm && (docker-compose -f docker-compose.prod.yml ps || docker compose -f docker-compose.prod.yml ps)'"
echo ""
echo "Для просмотра логов:"
echo "  ssh $SSH_OPTS root@$CUSTOM_IP 'cd /root/evm && (docker-compose -f docker-compose.prod.yml logs -f || docker compose -f docker-compose.prod.yml logs -f)'"
echo ""

# Закрытие SSH соединения
echo ""
echo "Закрытие SSH соединения..."
ssh $SSH_OPTS -O exit root@$CUSTOM_IP 2>/dev/null || true

echo ""
echo "Деплой завершен."
