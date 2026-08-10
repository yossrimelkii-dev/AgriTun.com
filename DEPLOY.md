# Deploying TunAgri to a VPS (Ubuntu 22.04 / 24.04)

This guide takes a fresh Ubuntu VPS from zero to a running TunAgri instance
served over HTTPS on `tunagri.com`, in about 20 minutes.

Stack:
- **Docker + Docker Compose**
- **Caddy** (auto-HTTPS reverse proxy via Let's Encrypt)
- **Local MongoDB** in a Docker container (faster than free Atlas + no
  network hop; you own the data + you own the backups)
- **Nightly Mongo backups** with 14-day retention

> **Ubuntu 26.04**: not released yet at the time of writing. These
> instructions are validated against 22.04 and 24.04 LTS.

---

## Prerequisites (5 min)

Before you SSH into the VPS:

- **Domain `tunagri.com`** with **A record** pointing to the VPS public IPv4
  (and **AAAA** if you have IPv6). Verify propagation:
  ```
  dig +short tunagri.com    # should return your VPS IP
  ```
  Also add a record for `www.tunagri.com` if you want that alias.
- A **Cloudinary** account for image uploads
  (used for product images, invoice logos).
- The **Atlas connection string** you're currently using, so we can migrate
  your existing data across.
- A **GitHub SSH key** or a deploy token so the VPS can clone the repo.

---

## 1. First-time server setup

SSH in as root (or a sudoer):

```bash
ssh root@YOUR_VPS_IP
```

Create a non-root user (skip if you already have one):

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy your key
```

Update the system and set up basic firewall + fail2ban:

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban git curl ca-certificates
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp     # HTTP/3 (QUIC)
ufw --force enable
systemctl enable --now fail2ban
```

Log out and back in as the `deploy` user:

```bash
exit
ssh deploy@YOUR_VPS_IP
```

---

## 2. Install Docker & Docker Compose

```bash
# Official Docker install script (safe and idempotent)
curl -fsSL https://get.docker.com | sudo sh

# Let the deploy user run docker without sudo
sudo usermod -aG docker "$USER"
# Log out & back in for the group change to take effect
exit
```

Reconnect and verify:

```bash
ssh deploy@YOUR_VPS_IP
docker --version           # 24.x or newer
docker compose version     # v2.x
```

---

## 3. Clone the repo

```bash
mkdir -p ~/apps && cd ~/apps
git clone git@github.com:YOUR_ORG/AgriTun.git tunagri
# or with HTTPS:
# git clone https://github.com/YOUR_ORG/AgriTun.git tunagri
cd tunagri
```

---

## 4. Configure environment variables

```bash
cp .env.production.example .env.production
nano .env.production
```

**Required** values:

| Variable                   | Value / where to get it                                    |
| -------------------------- | ---------------------------------------------------------- |
| `DOMAIN`                   | `tunagri.com`                                              |
| `ACME_EMAIL`               | `admin@tunagri.com` (or any inbox you control)             |
| `MONGO_ROOT_USER`          | e.g. `tunagri_admin`                                       |
| `MONGO_ROOT_PASSWORD`      | `openssl rand -hex 24` and paste                           |
| `MONGODB_URI`              | `mongodb://<user>:<password>@mongodb:27017/tunagri?authSource=admin` — user/password MUST match `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` |
| `NEXTAUTH_SECRET`          | `openssl rand -base64 48` and paste                        |
| `NEXTAUTH_URL`             | `https://tunagri.com`                                      |
| `NEXT_PUBLIC_APP_URL`      | `https://tunagri.com`                                      |
| `CLOUDINARY_CLOUD_NAME`    | Cloudinary → Dashboard                                     |
| `CLOUDINARY_API_KEY`       | Cloudinary → Dashboard                                     |
| `CLOUDINARY_API_SECRET`    | Cloudinary → Dashboard                                     |
| `ATLAS_URI`                | **Only for the one-time migration.** Your current Atlas connection string. Delete or leave blank after migration is done. |

Lock the file down so only you can read it:

```bash
chmod 600 .env.production
```

---

## 5. First deployment

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

That script:

1. Pulls the latest `main`.
2. Builds the app image (~3–5 min the first time; ~30 s after that with cache).
3. Rolls up **mongodb**, **web** and **caddy** with health checks.
4. Waits for the web container to become healthy.
5. Prunes old images so disk doesn't fill up.

When it finishes you should see:

```
✓ Deployed. tunagri-web is healthy.
```

At this point:
- Mongo is running locally with an **empty** database.
- The web app is up but has no data yet.
- Caddy is issuing a TLS cert for `tunagri.com`.

Visit `https://tunagri.com` — you'll see the app with empty lists. That's
expected before migration.

---

## 6. Migrate data from Atlas → local Mongo

Still SSH'd into the VPS, in `~/apps/tunagri`:

```bash
# Make sure ATLAS_URI is set in .env.production first!
./scripts/migrate-from-atlas.sh
```

What happens:

1. A temporary `mongo:7` container runs `mongodump` against your Atlas URI.
2. The dump is copied into the local `tunagri-mongo` container.
3. `mongorestore --drop` replaces any local collections with the Atlas
   snapshot, preserving indexes and namespaces.
4. Prints a collection-by-collection row count so you can sanity-check.

Expected output ends with:

```
users → 1234
products → 5678
orders → 910
invoices → 42
...
✓ Migration complete.
```

Once verified, remove the Atlas URI from `.env.production` so nobody
accidentally repoints back:

```bash
sed -i 's/^ATLAS_URI=.*/ATLAS_URI=/' .env.production
```

Refresh the site — data should now be visible.

---

## 7. Set up nightly backups (critical!)

Local Mongo means **you own the durability story**. If the VPS disk dies
without a backup, your data is gone. Set this up now, not later.

```bash
crontab -e
```

Add this line (03:00 UTC nightly):

```
0 3 * * *  /home/deploy/apps/tunagri/scripts/backup-mongo.sh >> /home/deploy/mongo-backup.log 2>&1
```

Manually test the first backup right now:

```bash
./scripts/backup-mongo.sh
ls -lh ~/mongo-backups/
```

You should see something like `tunagri-20260810-034512.gz`.

The script keeps the **last 14 nights** on disk. To keep more/fewer, set
`MONGO_BACKUP_RETENTION_DAYS` in `.env.production`.

### Off-site backups (highly recommended)

Backups on the same VPS don't help if the VPS itself is lost. Copy the
backup off-server. Simplest option — daily rsync to another server:

```
# Add after the backup line in crontab
30 3 * * *  rsync -az ~/mongo-backups/ backup@other-server:~/tunagri-backups/
```

Alternatives: rclone to S3/R2/Backblaze, upload to a paid backup service,
or use `restic`. Anything off-server works.

### Restoring a backup

```bash
./scripts/restore-mongo.sh ~/mongo-backups/tunagri-20260810-030000.gz
# Type RESTORE to confirm (it will DROP the current tunagri DB first)
```

---

## 8. Verifying everything

```bash
# See running containers (mongodb, web, caddy)
docker compose -f docker-compose.prod.yml ps

# Live app logs
docker compose -f docker-compose.prod.yml logs -f web

# Live Caddy (TLS / access) logs
docker compose -f docker-compose.prod.yml logs -f caddy

# Live Mongo logs
docker compose -f docker-compose.prod.yml logs -f mongodb

# Quick Mongo shell (from inside the container)
docker exec -it tunagri-mongo mongosh \
    --username tunagri_admin \
    --authenticationDatabase admin
```

Common early errors:

| Symptom                                          | Fix                                                       |
| ------------------------------------------------ | --------------------------------------------------------- |
| `MongoServerError: Authentication failed`         | `MONGODB_URI` password doesn't match `MONGO_ROOT_PASSWORD` |
| Caddy loops on TLS-ALPN failures                 | DNS hasn't propagated to `tunagri.com` yet                 |
| 502 Bad Gateway                                  | `web` container is still starting — check `docker logs`   |
| `CLOUDINARY_NOT_CONFIGURED` on upload            | You skipped the Cloudinary env vars                       |
| App reads empty data                              | You haven't run `migrate-from-atlas.sh` yet               |

---

## 9. Redeployments

Every subsequent deploy is a single command on the VPS:

```bash
cd ~/apps/tunagri
./scripts/deploy.sh
```

Deploy without pulling (e.g. after editing on the VPS):

```bash
./scripts/deploy.sh --no-pull
```

Deploy a feature branch:

```bash
./scripts/deploy.sh --branch feature/xyz
```

`deploy.sh` is safe to run repeatedly. Mongo data persists across
redeployments because it's stored in the `mongo_data` Docker volume,
not in the container filesystem.

---

## 10. Optional — auto-deploy on `git push` via GitHub Actions

1. On the VPS, add a public key from a **new GitHub Actions SSH key** to
   `~/.ssh/authorized_keys` for the `deploy` user.
2. In the repo → Settings → Secrets, add:
   - `VPS_HOST` — IP or hostname
   - `VPS_USER` — `deploy`
   - `VPS_SSH_KEY` — the private key
3. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to VPS
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: appleboy/ssh-action@v1.0.3
           with:
             host: ${{ secrets.VPS_HOST }}
             username: ${{ secrets.VPS_USER }}
             key: ${{ secrets.VPS_SSH_KEY }}
             script: cd ~/apps/tunagri && ./scripts/deploy.sh
   ```

Push to `main` → deploy fires automatically.

---

## 11. Operations cheatsheet

```bash
# Restart just the app
docker compose -f docker-compose.prod.yml restart web

# Restart just Mongo (keeps data via volume)
docker compose -f docker-compose.prod.yml restart mongodb

# Stop everything (data preserved)
docker compose -f docker-compose.prod.yml down

# Full rebuild ignoring cache (rare — 5+ min)
docker compose -f docker-compose.prod.yml build --no-cache

# Shell inside the web container
docker exec -it tunagri-web sh

# Follow all logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Disk usage
docker system df
du -sh ~/mongo-backups

# Free up disk (safe)
docker system prune -f
docker image prune -a -f

# NUCLEAR: destroy Mongo data (only if you know what you're doing)
docker compose -f docker-compose.prod.yml down
docker volume rm agritun_mongo_data agritun_mongo_config
```

---

## 12. Sizing your VPS

Rough guidance based on this stack (Mongo + Next.js + Caddy):

| VPS RAM | Comfortable for                     | Notes                                                        |
| ------- | ----------------------------------- | ------------------------------------------------------------ |
| 1 GB    | Not recommended                     | `next build` will OOM; app runs but is fragile               |
| 2 GB    | Small production (~50 concurrent)   | Set `--wiredTigerCacheSizeGB 0.5` (default in our compose)   |
| 4 GB    | Comfortable (~200 concurrent)       | Bump cache to 1 GB in `docker-compose.prod.yml`              |
| 8 GB+   | Growing production                  | Bump cache to 2 GB, consider a Mongo replica set eventually  |

Disk: budget **~2 GB for the app + Docker images**, **~5 GB for Mongo data
+ 14 days of gzipped backups** (typical B2B marketplace scale early on).
25 GB SSD is a comfortable starting size.

---

## 13. Troubleshooting quick reference

**Build fails on `pnpm install`**
Your `pnpm-lock.yaml` is out of sync. Locally: `pnpm install`, commit, push, redeploy.

**`Caddy: unable to solve challenge`**
Domain doesn't resolve to this server yet. Verify with
`dig +short tunagri.com` and wait for DNS.

**Container OOM-killed (out of memory)**
A VPS with <2 GB RAM will struggle to build. Either:
- Upgrade to 2 GB+ RAM, or
- Build the image locally (`docker build -t tunagri-web:latest .`),
  push to a registry, and `docker pull` on the VPS.

**Migration fails with "network timeout" to Atlas**
Your VPS IP isn't in the Atlas allowlist. Add it in
Atlas → Network Access temporarily (you can remove it after migration).

**Local Mongo returns "Authentication failed"**
The `MONGO_ROOT_PASSWORD` was changed after the volume was initialized.
The password baked into the volume is from the FIRST boot. To reset:
```bash
docker compose -f docker-compose.prod.yml down
docker volume rm agritun_mongo_data agritun_mongo_config
docker compose -f docker-compose.prod.yml up -d mongodb
./scripts/migrate-from-atlas.sh    # or restore from your latest backup
```

**Force-redeploy after a bad state**
```bash
docker compose -f docker-compose.prod.yml down
docker system prune -f
./scripts/deploy.sh
```
