#!/bin/bash
set -e

APP_DIR="/opt/moschee"

if [ -z "$1" ]; then
    echo "Usage: ./enable-ssl.sh <domain>"
    echo "Example: ./enable-ssl.sh verwaltung.moschee.ch"
    exit 1
fi

DOMAIN="$1"
echo "=== Enabling HTTPS for ${DOMAIN} ==="

# -------------------------------------------------------
# 1. Install Certbot
# -------------------------------------------------------
echo "[1/4] Installing Certbot..."
apt-get update -qq
apt-get install -y -qq certbot

# -------------------------------------------------------
# 2. Stop frontend temporarily to free port 80
# -------------------------------------------------------
echo "[2/4] Obtaining SSL certificate..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml stop frontend

# Get certificate (standalone mode uses port 80)
certbot certonly --standalone --non-interactive --agree-tos \
    --email admin@${DOMAIN} \
    -d "${DOMAIN}"

# -------------------------------------------------------
# 3. Create SSL nginx config
# -------------------------------------------------------
echo "[3/4] Configuring Nginx for HTTPS..."
cat > "$APP_DIR/nginx-ssl.conf" <<'NGINXEOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /usr/share/nginx/html;
    index index.html;

    client_max_body_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|ico|png|jpg|jpeg|gif|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Replace placeholder with actual domain
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "$APP_DIR/nginx-ssl.conf"

# Create SSL docker-compose override
cat > "$APP_DIR/docker-compose.ssl.yml" <<'COMPOSEEOF'
services:
  frontend:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
COMPOSEEOF

# -------------------------------------------------------
# 4. Restart with SSL
# -------------------------------------------------------
echo "[4/4] Restarting with HTTPS..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d

# Allow HTTPS through firewall
ufw allow 443/tcp

# -------------------------------------------------------
# 5. Setup auto-renewal
# -------------------------------------------------------
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'cd ${APP_DIR} && docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml restart frontend'") | sort -u | crontab -

echo ""
echo "=== HTTPS enabled! ==="
echo "App is now running at: https://${DOMAIN}"
echo ""
echo "Certificate auto-renews every 90 days."
echo ""
echo "To update the app with SSL:"
echo "  cd ${APP_DIR} && git pull && docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d --build"
