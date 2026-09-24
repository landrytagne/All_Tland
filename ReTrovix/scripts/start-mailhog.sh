#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# RetrouvIt — Start MailHog for email testing
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/start-mailhog.sh           # Start in foreground (Ctrl+C to stop)
#   ./scripts/start-mailhog.sh --bg      # Start in background
#
# Web UI: http://localhost:8025
# SMTP:   localhost:1025
# ═══════════════════════════════════════════════════════════════

set -e

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo ""
    echo "Options:"
    echo "  1. Install Docker: https://docs.docker.com/get-docker/"
    echo "  2. Run MailHog without Docker (macOS): brew install mailhog"
    echo "  3. Run MailHog without Docker (Linux): download from https://github.com/mailhog/MailHog/releases"
    echo ""
    exit 1
fi

# Check if MailHog container already exists
if docker ps -a --format '{{.Names}}' | grep -q 'retrouvit-mail'; then
    echo "📧 MailHog container already exists."
    
    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q 'retrouvit-mail'; then
        echo "✅ MailHog is already running!"
        echo ""
        echo "   Web UI: http://localhost:8025"
        echo "   SMTP:   localhost:1025"
        exit 0
    fi
    
    echo "🔄 Starting existing container..."
    docker start retrouvit-mail
    echo ""
    echo "✅ MailHog started!"
    echo "   Web UI: http://localhost:8025"
    echo "   SMTP:   localhost:1025"
    exit 0
fi

echo "📧 Starting MailHog..."
echo ""

if [ "$1" = "--bg" ]; then
    docker run -d \
        --name retrouvit-mail \
        -p 1025:1025 \
        -p 8025:8025 \
        --restart unless-stopped \
        mailhog/mailhog:latest
    
    echo "✅ MailHog started in background!"
    echo ""
    echo "   Web UI:  http://localhost:8025"
    echo "   SMTP:    localhost:1025"
    echo ""
    echo "   Stop with: docker stop retrouvit-mail"
    echo "   Logs:      docker logs -f retrouvit-mail"
else
    echo "   Web UI:  http://localhost:8025"
    echo "   SMTP:    localhost:1025"
    echo ""
    echo "   Press Ctrl+C to stop"
    echo "─────────────────────────────────────────"
    echo ""
    
    docker run --rm \
        --name retrouvit-mail \
        -p 1025:1025 \
        -p 8025:8025 \
        mailhog/mailhog:latest
fi
