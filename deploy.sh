#!/bin/bash
# VoiceFlow Pro - One-Click Deploy Script
# Run this on your Mac to deploy VoiceFlow Pro locally

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

echo "[1/5] Cloning repository..."
DEPLOY_DIR="$HOME/voiceflow-pro"
if [ -d "$DEPLOY_DIR" ]; then
    echo "  Directory exists, pulling latest changes..."
    cd "$DEPLOY_DIR"
    git pull origin main
else
    git clone https://github.com/mruskooctopus-dev/voiceOverPro.git "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

echo ""
echo "[2/5] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created .env file from template."
    echo "  IMPORTANT: Edit .env with your API keys before using TTS features."
else
    echo "  .env file already exists, skipping."
fi

echo ""
echo "[3/5] Creating required directories..."
mkdir -p audio-output
mkdir -p data

echo ""
echo "[4/5] Building Docker image..."
docker compose build

echo ""
echo "[5/5] Starting VoiceFlow Pro..."
docker compose up -d

echo ""
echo "========================================="
echo "  VoiceFlow Pro is running!"
echo "========================================="
echo ""
echo "  App:        http://localhost:1880/app"
echo "  Node-RED:   http://localhost:1880/admin"
echo "  Health:     http://localhost:1880/health"
echo ""
echo "  To stop:    cd $DEPLOY_DIR && docker compose down"
echo "  To logs:    cd $DEPLOY_DIR && docker compose logs -f"
echo ""
echo "  Remember to edit .env with your ElevenLabs API key!"
echo "========================================="
