# Турист: VPS deployment

This deployment is isolated from Vercel and Supabase. It starts a new PostgreSQL/PostGIS database and a new app. Existing accounts and progress are not imported. The Compose file does not publish PostgreSQL, and the web/API ports bind to loopback only. For this same-origin deployment, refresh cookies use `HttpOnly`, `Secure`, and `SameSite=Lax`; the existing cross-site demo retains its current behavior.

## Before deployment

1. Keep the existing Hostkey Nginx configuration and placeholder site in place until the new app has been built and checked.
2. Use the `main` commit containing these deployment files. Do not copy a development `.env` file to the server.
3. On the VPS, keep SSH open while changing firewall rules. Do not paste passwords, private keys, or `.env` contents into chat or screenshots.

## First boot on the VPS

Commands below are for an SSH shell as root. Replace `YOUR_GITHUB_REPOSITORY` with the repository's clone URL. Keep the repo in `/opt/turist` so the backup service paths match.

```bash
install -d -m 700 /opt/turist
git clone YOUR_GITHUB_REPOSITORY /opt/turist
cd /opt/turist
git switch main
git pull --ff-only origin main
```

If the VPS has no swap, create a 2 GiB swap file before building (the server has 2 GiB RAM and the frontend build can use a lot of memory). First check with `swapon --show`. Do not create a second swap file if one is already active.

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Create a fresh environment file. This generates cryptographically random secrets locally on the VPS and does not print them. Use the temporary local origin for the private SSH-tunnel check:

```bash
cd /opt/turist
bash ./deploy/create-production-env.sh http://localhost:8080
```

Build in separate steps to limit peak memory and start only the private database first:

```bash
docker compose --env-file .env -f docker-compose.production.yml build db
docker compose --env-file .env -f docker-compose.production.yml up -d db
docker compose --env-file .env -f docker-compose.production.yml ps
```

Wait for the database health status to say `healthy`. Then build the app and initialize the empty database exactly once. The initializer applies the Prisma schema and seeds the built-in POIs/items. The seed synchronizes POIs to the repository catalog, so never rerun it after live user data starts accumulating.

```bash
docker compose --env-file .env -f docker-compose.production.yml build backend frontend
docker compose --env-file .env -f docker-compose.production.yml --profile setup run --build --rm backend-init
docker compose --env-file .env -f docker-compose.production.yml up -d backend frontend
docker compose --env-file .env -f docker-compose.production.yml --profile staging up -d staging-proxy
```

Check health from the VPS before any public cutover:

```bash
curl --fail --silent --show-error http://127.0.0.1:3001/api/v1/poi/categories
curl --fail --silent --show-error http://127.0.0.1:8080/ > /dev/null
docker compose --env-file .env -f docker-compose.production.yml ps
```

For a browser check through a private SSH tunnel, run this on the Windows PC in a separate PowerShell window:

```powershell
ssh -i C:\Users\Artem\.ssh\id_ed25519_turist_hostkey -N -L 8080:127.0.0.1:8080 root@193.187.93.133
```

Keep that window open and visit `http://localhost:8080`. This tunnel is private to the SSH connection; no public staging port is opened. Register the two accounts you want to keep. They will be new accounts in the new database.

## Backups

Backups are written under `/var/lib/turist-backups` with mode 0600, validated with `pg_restore --list`, and older than 14 days are pruned. Install the daily systemd timer after confirming a manual backup works:

```bash
chmod 700 /opt/turist/deploy/backup-database.sh
install -m 644 /opt/turist/deploy/backup.service /etc/systemd/system/turist-backup.service
install -m 644 /opt/turist/deploy/backup.timer /etc/systemd/system/turist-backup.timer
systemctl daemon-reload
systemctl start turist-backup.service
ls -lh /var/lib/turist-backups
systemctl enable --now turist-backup.timer
systemctl list-timers turist-backup.timer
```

The local backup protects against database mistakes but not VPS loss. Before production cutover, copy a verified backup to storage outside this VPS and confirm it can be read there.

## Public cutover

Do this only after browser checks and at least one verified backup. First inspect and back up the current Nginx site configuration. Then change `.env` `CORS_ORIGIN` to the exact HTTPS origin and update the existing HTTPS server block to proxy `/api/` to `127.0.0.1:3001` and other requests to `127.0.0.1:3000`. Validate with `nginx -t` before reloading. Keep the old configuration copy so rollback is a single file restore plus `nginx -t && systemctl reload nginx`.

After the CORS origin change, recreate the backend so it reads the new setting:

```bash
docker compose --env-file .env -f docker-compose.production.yml up -d --force-recreate backend
```

The app sends HSTS for one year without `includeSubDomains`, and the refresh cookie stays `HttpOnly` and `Secure`. Do not use `docker compose down -v`; it permanently deletes the database volume.

## Routine updates

Before each update, make and verify a database backup. Pull only the intended `main` commit, build images, recreate services, then check logs and API responses. Never run the setup profile or seed again on a live database without a reviewed migration plan.
