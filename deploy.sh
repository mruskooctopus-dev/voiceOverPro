#!/bin/bash
# VoiceFlow Pro - One-Click Deploy Script
#   Run this on your Mac to deploy VoiceFlow Pro locally

set -e

echo "========================================="
echo "  VoiceFlow Pro - Local Deployment"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running."
    echo "Please start Docker Desktop and try again."
    exit 1
fi

REPO_URL="https://github.com/mruskooctopus-dev/voiceOverPro.git"
INSTALL_DIR="$HOME/voiceflow-pro"

# Check if already installed
if [ -d "$INSTALL_DIR" ]; then
    echo "[*] Existing installation found at $INSTALL_DIR"
    echo "[*] Stopping old containers..."
    cd "$INSTALL_DIR"
    docker compose down 2>/dev/null || true
    
    echo "[*] Removing old Docker volume (clean rebuild)..."
    docker volume rm voiceflow-pro_voiceflow-data 2>/dev/null || true
    
    echo "[*] Removing old Docker image..."
    docker rmi voiceflow-pro-voiceflow-pro 2>/dev/null || true
    
    echo "[*] Pulling latest code..."
    git pull origin main
else
    echo "[1/5] Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Setup environment file
if [ ! -f .env ]; then
    echo "[*] Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Edit $INSTALL_DIR/.env with your API keys before starting!"
    echo "  Required: ELEVENLABS_API_KEY"
    echo "  Optional: OCTOPUS_API_URL, OCTOPUS_API_KEY"
    echo ""
    read -p "Would you like to edit .env now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v nano &> /dev/null; then
            nano .env
        elif command -v vi &> /dev/null; then
            vi .env
        else
            open .env
        fi
    fi
fi

echo "[*] Building Docker image..."
docker compose build --no-cache

echo "[*] Starting VoiceFlow Pro..."
docker compose up -d

echo ""
echo "========================================="
echo "  VoiceFlow Pro is starting up!"
echo "========================================="
echo ""
echo "  App UI:        http://localhost:1880/app"
echo "  Node-RED Admin: http://localhost:1880/admin"
echo "  Health Check:   http://localhost:1880/health"
echo ""
echo "  Config file:    $INSTALL_DIR/.env"
echo "  Logs:           docker compose logs -f"
echo "  Stop:           docker compose down"
echo "  Restart:        docker compose restart"
echo ""
echo "Waiting for startup (30s)..."
sleep 30

# Health check
if wget -q --spider http://localhost:1880/health 2>/dev/null || curl -sf http://localhost:1880/health > /dev/null 2>&1; then
    echo "VoiceFlow Pro is running! Open http://localhost:1880/app"
else
    echo "WARNING: Health check failed. Check logs with: docker compose logs"
fi
