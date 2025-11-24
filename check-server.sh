#!/bin/bash

# Скрипт для проверки состояния проекта на сервере
# Использование: ./check-server.sh [IP_ADDRESS]

IP="${1:-207.154.207.198}"

echo "Checking server status at $IP..."
echo ""

ssh root@$IP << 'EOF'
  echo "=== Server Information ==="
  echo "Current directory: $(pwd)"
  echo ""
  
  echo "=== Checking /root/evm ==="
  if [ -d /root/evm ]; then
    echo "✓ /root/evm exists"
    echo "Contents:"
    ls -la /root/evm
    echo ""
    
    if [ -f /root/evm/docker-compose.yml ]; then
      echo "✓ docker-compose.yml found"
    else
      echo "✗ docker-compose.yml NOT found"
    fi
    
    echo ""
    echo "Subdirectories:"
    ls -d /root/evm/*/ 2>/dev/null | while read dir; do
      echo "  $(basename $dir):"
      ls -la "$dir" | head -5
    done
  else
    echo "✗ /root/evm does NOT exist"
  fi
  echo ""
  
  echo "=== Checking /root/source ==="
  if [ -d /root/source ]; then
    echo "✓ /root/source exists"
    ls -la /root/source
  else
    echo "✗ /root/source does NOT exist"
  fi
  echo ""
  
  echo "=== Docker Status ==="
  if command -v docker &> /dev/null; then
    echo "✓ Docker is installed"
    docker ps -a
  else
    echo "✗ Docker is NOT installed"
  fi
  echo ""
  
  echo "=== Docker Compose Status ==="
  if command -v docker-compose &> /dev/null; then
    echo "✓ docker-compose is installed"
    cd /root/evm 2>/dev/null && docker-compose ps 2>/dev/null || echo "  (not running or no docker-compose.yml)"
  elif docker compose version &> /dev/null; then
    echo "✓ docker compose is available"
    cd /root/evm 2>/dev/null && docker compose ps 2>/dev/null || echo "  (not running or no docker-compose.yml)"
  else
    echo "✗ docker-compose is NOT available"
  fi
  echo ""
  
  echo "=== Disk Usage ==="
  df -h /root
EOF




