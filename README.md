# Campus Resource Exchange (CRX)

**Find what you need. Pass on what you no longer use.**

Campus Resource Exchange (CRX) is a private, institutional academic resource-sharing and equipment lending utility built for verified college students and campus administrators.

---

## 1. Project Overview

Within every academic semester, students purchase textbooks, scientific calculators, drafting kits, microcontroller boards, and lab coats that sit unused once a course concludes, while incoming cohorts struggle to locate those exact course materials or reliable past examination papers. **Campus Resource Exchange (CRX)** provides a structured, moderated campus catalog for lending physical academic equipment and sharing moderator-approved digital course archives.

## 2. Problem Statement

Informal messaging groups and bulletin boards lack:
- **Academic Taxonomy**: Items cannot be filtered reliably by department, semester (1–8), course code, or subject.
- **Lending Accountability**: There is no state tracking for who borrowed a piece of equipment, when it is due back, or whether it is currently available.
- **File Safety & Moderation**: Unmoderated file links risk malware distribution, copyright violations, or disorganized study materials.
- **Institutional Privacy**: Public boards expose personal phone numbers and student email addresses to scraping.

## 3. Core Features

- **Verified Institutional Authentication**: College domain allowlist enforcement (`.edu`, `.ac.in`, and admin-configured campus domains), BCrypt password hashing, HttpOnly + SameSite cookies, CSRF verification headers, and Google OAuth integration via Firebase.
- **Dual Resource Catalog (Physical & Digital)**:
  - **Physical Resources**: Textbooks, calculators, lab instruments, and project hardware supporting temporary borrowing (`BORROW`) or permanent free transfer (`GIVEAWAY`), condition tags (`NEW`, `GOOD`, `FAIR`), campus pickup locations, and client-side WebP image compression.
  - **Digital Resources**: Lecture notes, lab manuals, and previous-year papers validated by extension, MIME type, file size, and magic-byte file headers, stored outside the public web root and gated by moderator approval.
- **Deterministic Borrow & Return State Machine**:
  - Enforces valid transitions: `AVAILABLE` → `REQUESTED` → `APPROVED` → `BORROWED` → `RETURN_REQUESTED` → `RETURNED` (plus `CANCELLED`, `REJECTED`, and `OVERDUE`).
- **Student Requests Board ("I Need")**: Allows students to post specific course material needs with deadlines and lets peers fulfill them or link existing catalog listings.
- **Contextual Resource Messaging**: Scoped strictly to active resource handovers (no noisy global chat).
- **Admin Governance & Immutable Audit Log**: Moderation queue for pending uploads, user verification/suspension controls, abuse report resolution, academic taxonomy management, and an administrative audit trail.
- **Legal & Privacy Governance**: Dedicated `/privacy` (with self-service JSON data export and account deletion), `/terms`, and a consent-first cookie banner that blocks optional aggregate analytics until explicitly accepted.

## 4. Architecture & Project Structure

CRX follows a **Modular Monolith** architecture (avoiding unnecessary microservices, message brokers, or distributed complexity):

```text
├── db/
│   └── schema.sql                 # Normalized 3NF PostgreSQL DDL & indexes
├── docs/
│   └── BACKUP_AND_DEPLOYMENT.md   # Backup, restore, custom domain & security checklist
├── public/
│   ├── favicon.svg                # Crisp CRX institutional mark
│   ├── og-preview.svg             # Open Graph social card preview
│   ├── robots.txt                 # Crawler access rules
│   └── sitemap.xml                # Public indexable routes
├── server/
│   ├── openapi.ts                 # OpenAPI 3.0 specification & aggregate analytics
│   ├── security.ts                # BCrypt, JWT, CSRF, rate limiting, file signature validator
│   └── store.ts                   # Persistence engine, state machine & seed isolation
├── src/
│   ├── components/
│   │   ├── ui/index.tsx           # Reusable UI component library (17 primitives)
│   │   ├── ActivityProfileView.tsx
│   │   ├── AdminDashboardView.tsx
│   │   ├── AuthModal.tsx
│   │   ├── CatalogView.tsx
│   │   ├── CookieConsentBanner.tsx
│   │   ├── HowItWorksAboutView.tsx
│   │   ├── LandingView.tsx
│   │   ├── ListResourceModal.tsx
│   │   ├── Navbar.tsx
│   │   ├── NotFoundView.tsx
│   │   ├── PrivacyView.tsx
│   │   ├── RequestsBoardView.tsx
│   │   ├── ResourceDetailModal.tsx
│   │   └── TermsView.tsx
│   ├── utils/
│   │   ├── analytics.ts           # Consent-gated privacy-conscious analytics
│   │   ├── image.ts               # Client-side WebP image compression
│   │   └── seo.ts                 # Dynamic per-route title, canonical & OG tags
│   ├── api.ts                     # Fetch client with CSRF, bearer & timeout handling
│   ├── firebase.ts                # Firebase Auth & Firestore synchronization
│   └── types.ts                   # Shared TypeScript domain contracts
├── tests/
│   └── security-and-api.test.ts   # Automated security & state-machine test suite
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── server.ts                      # Express API & production static server
```

## 5. Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite 8
- **Backend / API**: Node.js + Express REST API (with Spring Boot / PostgreSQL compatible 3NF schema in `db/schema.sql`)
- **Database & Cloud Sync**: PostgreSQL (`db/schema.sql`) + Firebase Authentication & Cloud Firestore (`firestore.rules`)
- **Containerization**: Docker (`Dockerfile.frontend`, `Dockerfile.backend`, `docker-compose.yml`)

## 6. Database Design

The relational schema (`db/schema.sql`) is normalized to Third Normal Form (3NF) with foreign-key constraints and composite indexes for low-latency catalog filtering:
- `colleges`, `departments`, `semesters`, `subjects`, `categories`
- `users` (with `idx_users_college_role` and isolated email privacy)
- `resources` and `resource_files` (with `idx_resources_catalog_filter` and full-text search index)
- `borrow_requests`, `resource_need_requests`, `contextual_messages`
- `notifications`, `content_reports`, `audit_logs`

## 7. API Documentation

An OpenAPI 3.0 specification is available at `GET /api/openapi.json` (authenticated). Key endpoints include:
- `GET /health` — Minimal health status (`{ status: "UP", timestamp }`)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/resources`, `POST /api/resources`, `GET /api/resources/:id`, `DELETE /api/resources/:id`, `GET /api/resources/:id/download`
- `POST /api/resources/:id/requests`, `PATCH /api/borrow-requests/:id/transition`, `POST /api/borrow-requests/:id/rating`
- `GET /api/resource-requests`, `POST /api/resource-requests`, `POST /api/resource-requests/:id/Fulfill`
- `GET /api/notifications`, `POST /api/notifications/read-all`
- `POST /api/reports`, `GET /api/admin/overview`, `PATCH /api/admin/resources/:id/moderation`, `PATCH /api/admin/reports/:id`

## 8. Authentication & Security Model

1. **Defense in Depth**: Every protected endpoint verifies JWT signature, token revocation status, user suspension status, and role permissions (`STUDENT` vs `ADMIN`).
2. **IDOR Prevention**: Resource mutations, borrow transitions, and message visibility check `req.authUser.id` against resource ownership or transaction participation.
3. **Untrusted File Handling**: Uploaded files are validated against extension allowlists/blocklists, MIME type, size limits, and binary magic bytes (`%PDF-`, PNG, JPEG, WebP, ZIP) and stored outside the web root.
4. **Rate Limiting & Spam Protection**: Dedicated rate limiters protect authentication, resource creation, file downloads, reporting, and messaging endpoints.

## 9. Local Setup & Environment Variables

1. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   npm install
   npm run dev
   ```
2. Open `http://localhost:3000`.

## 10. Docker Setup & Production Deployment

```bash
export POSTGRES_PASSWORD="strong-db-password"
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build -d
```

See [`docs/BACKUP_AND_DEPLOYMENT.md`](docs/BACKUP_AND_DEPLOYMENT.md) for PostgreSQL backup/restore procedures, media volume backup, and custom domain HTTPS configuration.

## 11. Testing

Run the TypeScript compiler check and automated security/workflow test suite:

```bash
npm run lint
npx tsx tests/security-and-api.test.ts
```

## 12. Privacy Considerations, Known Limitations & Future Improvements

- **Privacy Considerations**: Student email addresses are never exposed publicly; optional usage analytics are strictly aggregate and disabled until cookie consent is granted; users can export or delete their account data at `/privacy`.
- **Known Limitations**: Physical handovers rely on mutual in-person confirmation on campus; institutional email verification in local demo mode logs reset/verification events rather than dispatching external SMTP mail unless an institutional SMTP relay is configured.
- **Future Improvements**: Barcode/QR scanning at library desks for instant handover verification, and automated semester-end return reminders.
