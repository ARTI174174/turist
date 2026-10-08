#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR=/opt/turist
BACKUP_DIR=/var/lib/turist-backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$BACKUP_DIR/turist-$STAMP.dump"
TEMP="$FINAL.partial"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
trap 'rm -f "$TEMP"' EXIT

docker compose --env-file "$APP_DIR/.env" -f "$APP_DIR/docker-compose.production.yml" \
  exec -T db sh -ec 'pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$TEMP"

test -s "$TEMP"
docker run --rm -i turist-postgis:17-3.5 pg_restore --list < "$TEMP" >/dev/null
chmod 600 "$TEMP"
mv "$TEMP" "$FINAL"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'turist-*.dump' -mtime +14 -delete
printf 'Verified backup created: %s\n' "$FINAL"
