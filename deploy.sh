#!/bin/bash
set -e

REPO_URL="https://github.com/dinalu20/verwaltung.git"
APP_DIR="/opt/moschee"

echo "=== Moschee-Verwaltung Deployment ==="
echo ""

# -------------------------------------------------------
# 1. System update & Docker installation
# -------------------------------------------------------
echo "[1/5] Installing Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
fi
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

# -------------------------------------------------------
# 2. Firewall
# -------------------------------------------------------
echo "[2/5] Configuring firewall..."
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw --force enable

# -------------------------------------------------------
# 3. Clone or update repo
# -------------------------------------------------------
echo "[3/5] Setting up application..."
if [ -d "$APP_DIR" ]; then
    echo "  Updating existing installation..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "  Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# -------------------------------------------------------
# 4. Create .env if it doesn't exist
# -------------------------------------------------------
echo "[4/5] Checking environment..."
if [ ! -f "$APP_DIR/.env" ]; then
    JWT_SECRET=$(openssl rand -base64 48)
    DB_PASSWORD=$(openssl rand -base64 24)
    ADMIN_PASSWORD=$(openssl rand -base64 12)

    cat > "$APP_DIR/.env" <<EOL
DB_NAME=moschee
DB_USER=moschee
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOL

    chmod 600 "$APP_DIR/.env"
    echo ""
    echo "  ============================================"
    echo "  .env created with generated passwords."
    echo "  Admin password: ${ADMIN_PASSWORD}"
    echo "  SAVE THIS PASSWORD - it will not be shown again!"
    echo "  ============================================"
    echo ""
fi

# -------------------------------------------------------
# 5. Build and start
# -------------------------------------------------------
echo "[5/5] Building and starting services..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== Deployment complete! ==="
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "App is running at: http://${SERVER_IP}"
echo ""
echo "Login with:"
echo "  Username: admin"
echo "  Password: (see above or check $APP_DIR/.env)"
echo ""
echo "Useful commands:"
echo "  Logs:    cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop:    cd $APP_DIR && docker compose -f docker-compose.prod.yml down"
echo "  Update:  cd $APP_DIR && git pull && docker compose -f docker-compose.prod.yml up -d --build"
