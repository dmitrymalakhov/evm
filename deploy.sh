#!/bin/bash

# Функция для отображения помощи
show_help() {
    echo "Usage: $0 [--api] [--web] [--telegram-bot] [--ip <IP_ADDRESS>]"
    echo
    echo "Options:"
    echo "  --api           Deploy the api service"
    echo "  --web           Deploy the web service"
    echo "  --telegram-bot  Deploy the telegram-bot service"
    echo "  --ip <IP_ADDRESS> Custom IP address for deployment"
    exit 1
}

# Проверка аргументов командной строки
DEPLOY_API=false
DEPLOY_WEB=false
DEPLOY_TELEGRAM_BOT=false
CUSTOM_IP="207.154.207.198"  # Дефолтный IP

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
        *)
        show_help
        ;;
    esac
done

# Проверка, что хотя бы один проект выбран для деплоя
if [ "$DEPLOY_API" = false ] && [ "$DEPLOY_WEB" = false ] && [ "$DEPLOY_TELEGRAM_BOT" = false ]; then
    show_help
fi

echo "Starting deployment..."

cd "$(dirname "$0")" || { echo "Failed to change directory"; exit 1; }

rm -rf dist
mkdir -p dist

# Сборка и копирование файлов для api
if [ "$DEPLOY_API" = true ]; then
    echo "Deploying api..."
    cd api || { echo "Failed to enter api directory"; exit 1; }
    pnpm run build || { echo "Build failed for api"; exit 1; }

    mkdir -p ../dist/api
    cp -r dist/* ../dist/api
    cp Dockerfile ../dist/api
    cp package.json ../dist/api
    cp pnpm-lock.yaml ../dist/api
    cp pnpm-workspace.yaml ../dist/api
    cp tsconfig.json ../dist/api
    cp -r drizzle ../dist/api
    cp -r src ../dist/api

    cd ..
fi

# Сборка и копирование файлов для web
if [ "$DEPLOY_WEB" = true ]; then
    echo "Deploying web..."
    cd web || { echo "Failed to enter web directory"; exit 1; }

    mkdir -p ../dist/web

    # Копируем все файлы web в dist используя git для исключения игнорируемых файлов
    git ls-files -z --cached --others --exclude-standard | tar --null -T - -cvzf temp-archive.tar.gz
    
    tar -xzf temp-archive.tar.gz -C ../dist/web
    rm temp-archive.tar.gz

    cp Dockerfile ../dist/web
    cp package.json ../dist/web
    cp pnpm-lock.yaml ../dist/web
    cp pnpm-workspace.yaml ../dist/web
    
    cd ..
fi

# Сборка и копирование файлов для telegram-bot
if [ "$DEPLOY_TELEGRAM_BOT" = true ]; then
    echo "Deploying telegram-bot..."
    cd telegram-bot || { echo "Failed to enter telegram-bot directory"; exit 1; }
    pnpm run build || { echo "Build failed for telegram-bot"; exit 1; }

    mkdir -p ../dist/telegram-bot
    cp -r dist/* ../dist/telegram-bot
    cp Dockerfile ../dist/telegram-bot
    cp package.json ../dist/telegram-bot
    cp pnpm-lock.yaml ../dist/telegram-bot
    cp tsconfig.json ../dist/telegram-bot
    cp -r src ../dist/telegram-bot

    cd ..
fi

cp docker-compose.yml dist

# Проверка содержимого dist перед архивированием
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
echo "Creating archive..."
tar -czvf evm-source.tar -C ./dist .

# Проверка размера архива
echo "Archive created. Size:"
ls -lh evm-source.tar

# Копирование архива на удаленный сервер
echo "Copying archive to server..."
ssh root@$CUSTOM_IP "mkdir -p /root/source" || { echo "Failed to create source directory on server"; exit 1; }
scp evm-source.tar root@$CUSTOM_IP:/root/source/ || { echo "Failed to copy file to server"; exit 1; }

# Проверка, что файл скопировался
echo "Verifying archive on server..."
ssh root@$CUSTOM_IP "ls -lh /root/source/evm-source.tar" || { echo "Archive not found on server"; exit 1; }

# Вход на удаленный сервер и разархивирование
echo "Deploying on server..."
ssh root@$CUSTOM_IP bash << EOF
  set -e
  
  echo "Checking docker-compose..."
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: docker-compose not found on server"
    exit 1
  fi
  
  # Определяем команду docker-compose
  if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
  else
    DOCKER_COMPOSE="docker compose"
  fi
  
  mkdir -p /root/evm
  mkdir -p /root/source

  cd /root/evm

  echo "Extracting archive..."
  tar -xzvf /root/source/evm-source.tar -C /root/evm

  echo "Verifying extracted files..."
  echo "Contents of /root/evm:"
  ls -la /root/evm
  
  if [ -f /root/evm/docker-compose.yml ]; then
    echo "✓ docker-compose.yml found"
  else
    echo "✗ docker-compose.yml NOT found!"
    exit 1
  fi

  echo "Removing archive..."
  rm -f /root/source/evm-source.tar

  export NODE_ENV=production

  if [ "$DEPLOY_API" = true ]; then
    echo "Deploying api..."
    if [ -d /root/evm/api ]; then
      echo "✓ API directory found"
    else
      echo "✗ API directory NOT found!"
      exit 1
    fi
    \$DOCKER_COMPOSE stop api || true
    \$DOCKER_COMPOSE up api -d --build
  fi

  if [ "$DEPLOY_WEB" = true ]; then
    echo "Deploying web..."
    if [ -d /root/evm/web ]; then
      echo "✓ Web directory found"
    else
      echo "✗ Web directory NOT found!"
      exit 1
    fi
    \$DOCKER_COMPOSE stop web || true
    \$DOCKER_COMPOSE up web -d --build
  fi

  if [ "$DEPLOY_TELEGRAM_BOT" = true ]; then
    echo "Deploying telegram-bot..."
    if [ -d /root/evm/telegram-bot ]; then
      echo "✓ Telegram-bot directory found"
    else
      echo "✗ Telegram-bot directory NOT found!"
      exit 1
    fi
    \$DOCKER_COMPOSE stop telegram-bot || true
    \$DOCKER_COMPOSE up telegram-bot -d --build
  fi

  echo ""
  echo "Deployment completed on server"
  echo "Final contents of /root/evm:"
  ls -la /root/evm
EOF

# Отобразить сообщение о завершении
echo ""
echo "########################################"
echo "#                                      #"
echo "#         Deployment finished!         #"
echo "#                                      #"
echo "########################################"
echo ""

# Подождать ввода пользователя перед завершением
echo "Press Enter to exit..."

# Специальный цикл для Windows Git Bash - обеспечит, что окно не закроется
while [ true ]; do
    read -t 3600 input  # ждать 1 час (можно изменить время)
    if [ $? = 0 ]; then
        break  # Выход из цикла, если получен ввод
    fi
done

echo "Exiting..."
