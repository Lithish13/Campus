# PostgreSQL Backup, Recovery & Production Deployment Guide

This guide documents the database backup, database restore, private media archive backup, configuration recovery, custom domain setup, and security verification checklist for **Campus Resource Exchange (CRX)**.

> **Important Operational Note**: Backups are not active automatically unless the cron jobs or storage scripts below are explicitly configured on your host server.

---

## 1. Database Backup Strategy (PostgreSQL)

Use `pg_dump` in custom compressed format (`-Fc`) against the internal `postgres` container so all tables, indexes, and constraints can be restored atomically:

```bash
# Create timestamped compressed PostgreSQL dump
BACKUP_TS=$(date -u +"%Y%m%dT%H%M%SZ")
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-crx_app}" \
  -d "${POSTGRES_DB:-crx_production}" \
  -Fc > "/var/backups/crx/crx_db_${BACKUP_TS}.dump"

# Verify backup file integrity and generate SHA-256 checksum
sha256sum "/var/backups/crx/crx_db_${BACKUP_TS}.dump" > "/var/backups/crx/crx_db_${BACKUP_TS}.dump.sha256"
```

---

## 2. Database Restore Procedure

To restore a compressed dump into a clean or recovering PostgreSQL instance:

```bash
# 1. Verify checksum before restoring
sha256sum -c "/var/backups/crx/crx_db_20260928T020000Z.dump.sha256"

# 2. Restore with pg_restore (--clean --if-exists)
cat "/var/backups/crx/crx_db_20260928T020000Z.dump" | \
  docker compose exec -T postgres pg_restore \
  -U "${POSTGRES_USER:-crx_app}" \
  -d "${POSTGRES_DB:-crx_production}" \
  --clean --if-exists --no-owner
```

---

## 3. Private Uploaded Media Backup

Digital course resources and item photographs are stored outside the public web root inside the `private_uploads_data` volume (`/app/private_uploads`). Back up this volume alongside the database:

```bash
BACKUP_TS=$(date -u +"%Y%m%dT%H%M%SZ")
docker run --rm \
  -v crx_private_uploads_data:/data:ro \
  -v /var/backups/crx:/backup \
  alpine tar -czf "/backup/crx_media_${BACKUP_TS}.tar.gz" -C /data .
```

To restore uploaded files:

```bash
docker run --rm \
  -v crx_private_uploads_data:/data \
  -v /var/backups/crx:/backup:ro \
  alpine tar -xzf "/backup/crx_media_20260928T020000Z.tar.gz" -C /data
```

---

## 4. Configuration & Secrets Recovery

1. Provision a new host with Docker Engine and Docker Compose.
2. Restore environment variables into `/etc/crx/.env` from your institution's secret manager (`JWT_SECRET`, `POSTGRES_PASSWORD`, `APP_URL`, `FRONTEND_URL`, `VITE_API_BASE_URL`).
3. Start the database and restore the latest `pg_dump` and media archive.
4. Start `backend` and `frontend` services and verify `GET https://your-domain.com/health` returns `{"status":"UP"}`.

---

## 5. Custom Domain & HTTPS Enforcement (`https://your-domain.com`)

- Set `APP_URL=https://your-domain.com` and `FRONTEND_URL=https://your-domain.com` in the backend environment.
- Set `VITE_API_BASE_URL=https://your-domain.com` when building the frontend bundle if the API is hosted on a separate origin.
- Terminate TLS 1.2/1.3 at the reverse proxy (Nginx / Caddy / Cloud Load Balancer) and enforce HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).

---

## 6. Final Security Verification Checklist (Section 93)

- [x] API keys hidden (`GEMINI_API_KEY` and `JWT_SECRET` kept server-side only)
- [x] Secrets stored in environment variables (`.env.example` contains placeholders only)
- [x] `.env` ignored in `.gitignore`
- [x] Passwords hashed with BCrypt (`bcryptjs`, 10 salt rounds)
- [x] Authentication implemented (JWT in `HttpOnly`, `SameSite=Lax` cookie + Bearer support)
- [x] Authorization implemented (`requireAuth` and `requireAdmin` middleware)
- [x] Admin routes protected (`/api/admin/*` restricted to `UserRole.ADMIN`)
- [x] IDOR tested and prevented (resource deletion, borrow transitions, and private email isolation verified against `req.authUser.id`)
- [x] SQL injection & NoSQL injection protected (strict input normalization and schema rules)
- [x] XSS protected (`normalizePlainText` strips HTML/script tags; CSP header active)
- [x] CSRF considered and enforced (`X-CSRF-Token` verified on cookie-authenticated mutations)
- [x] CORS restricted to configured `APP_URL` / `FRONTEND_URL`
- [x] Rate limiting enabled on login, registration, uploads, resources, reports, messages, and requests
- [x] File uploads validated by extension, MIME type, byte size, and magic-byte binary signatures
- [x] Dangerous executable/script file types blocked (`.exe`, `.bat`, `.cmd`, `.sh`, `.jar`, `.scr`, `.ps1`, `.msi`, `.dll`, `.vbs`)
- [x] File paths protected against traversal (`path.basename` + randomized UUID storage keys outside public root)
- [x] Security headers enabled (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`)
- [x] Minimal `/health` endpoint exposes zero credentials or internal config
- [x] Structured observability logs contain no passwords, tokens, or PII
- [x] Error messages return structured `{ success: false, error: { code, message } }` without stack traces
- [x] Privacy Policy (`/privacy`) and Terms and Conditions (`/terms`) added with operator placeholders
- [x] Cookie Consent banner implemented; optional analytics disabled prior to explicit consent
- [x] Custom 404 page added
- [x] `/sitemap.xml`, `/robots.txt`, `/favicon.svg`, and `/og-preview.svg` social card configured
