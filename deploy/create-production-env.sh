#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR=/opt/turist
ENV_FILE="$APP_DIR/.env"
ORIGIN="${1:-}"

if [[ ! "$ORIGIN" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo 'Usage: create-production-env.sh https://your-domain.example' >&2
  exit 2
fi
if [[ -e "$ENV_FILE" ]]; then
  echo 'Refusing to overwrite existing .env. Back it up and review it first.' >&2
  exit 1
fi

mkdir -p "$APP_DIR"
chmod 700 "$APP_DIR"
DB_PASSWORD="$(openssl rand -hex 32)"
ADMIN_PASSWORD="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 48)"
TEMP_FILE="$(mktemp "$APP_DIR/.env.XXXXXXXX")"
trap 'rm -f "$TEMP_FILE"' EXIT

cat > "$TEMP_FILE" <<EOF
DB_NAME=turist_db
DB_USER=turist_app
DB_PASSWORD=$DB_PASSWORD
POSTGRES_ADMIN_USER=turist_admin
POSTGRES_ADMIN_PASSWORD=$ADMIN_PASSWORD
JWT_ACCESS_SECRET=$JWT_SECRET
JWT_ACCESS_TTL=15m
REFRESH_COOKIE_SAME_SITE=lax
CORS_ORIGIN=$ORIGIN
API_PORT=3001
WEB_PORT=3000
NEXT_PUBLIC_API_URL=/api/v1
ANTICHEAT_MAX_SPEED_KMH=180
ANTICHEAT_SCORE_REVIEW_THRESHOLD=61
ANTICHEAT_SCORE_REJECT_THRESHOLD=86
EOF

chmod 600 "$TEMP_FILE"
mv "$TEMP_FILE" "$ENV_FILE"
trap - EXIT
echo 'Production environment created with fresh random secrets; values were not printed.'
