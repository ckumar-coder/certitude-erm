# GRC Workstation — Beta V1.0 (Certitude Advisory Services)

A multi-tenant, role-based, audit-logged GRC platform covering Policies,
Controls, KRIs, Compliance Obligations, Issues & Actions, dashboards, bulk
import/export, notifications, and per-client branding. This is the Beta
V1.0 build -- all 10 phases of the Tier 1 roadmap are complete (see
"Project status" below). If you're picking this codebase up cold, read
this first.

## What's new in v2

**Multi-tenancy (G1)**
- Every record now belongs to a `company` (tenant). A single login can have
  access to multiple companies (e.g. a Group CFO overseeing several
  subsidiaries) via the `user_companies` table, each with its own role.
- `companies.parent_company_id` supports group/subsidiary structures for
  future consolidated dashboards.

**Authentication & sessions (G8)**
- Login is now email + password (not username). Sessions are server-side
  (`sessions` table, opaque token) rather than stateless JWT, so we can
  enforce a **10-minute sliding inactivity timeout** and revoke sessions
  immediately on lockout or logout.
- Password policy: 10+ chars, upper/lower/number/special character, no
  reuse of the last 5 passwords, 90-day forced rotation (all configurable
  via env vars).
- Account lockout after 5 failed attempts (configurable lockout duration);
  lockout immediately invalidates existing sessions.

**RBAC (Section E)**
- Three roles per company: **Admin** (full access), **Manager** (own
  department's risks, can't self-approve), **Viewer** (no risk register
  access in Tier 1 — published policies only, in a later phase).
- `is_super_admin` is for the consulting firm's own staff: implicit Admin
  access to every company in the instance.

**Audit log (G10)**
- Generic, append-only `audit_log` table. Every module logs into this
  rather than rolling its own history mechanism. Corrections are made via
  new entries, never overwrites.

**Frontend**
- The old hand-built `build-ui.js` (string-templated HTML) has been
  replaced with a proper React app (`frontend/`, Vite-based), which builds
  into `public/` and is served by Express. This is the foundation the
  remaining module UIs (Policies, Controls, KRIs, etc.) will be added to.

## Local setup (fresh install)

```bash
# 1. Install backend dependencies
npm install

# 2. Start Postgres (your own instance, or via docker compose)
docker compose up -d db

# 3. Apply the v2 schema (skip if using docker compose -- it auto-applies on first boot)
psql "$DATABASE_URL" -f schema_v2.sql

# 4. Build the frontend
npm run build:frontend

# 5. Configure environment
cp .env.example .env   # fill in DATABASE_URL, etc.

# 6. Start the server
npm start
```

You'll need to seed at least one company and one super-admin user directly
in the database for a brand-new instance (see `schema_v2.sql` for table
shapes) — a setup/seed script is a good Phase 1 addition.

## Upgrading an existing v1 database

If you have an existing v1 (single-tenant, username/password) database:

```bash
DATABASE_URL=postgresql://... \
COMPANY_NAME="Your Client Name" \
COMPANY_CODE="ABC" \
npm run migrate:v2
```

This is idempotent and safe to re-run. It:
- Creates a default company to hold all existing data
- Renames `users` → `users_v1_legacy` (preserved, not deleted) and creates
  the new email-based `users` + `user_companies` tables
- Migrates each user (deriving an email if their username wasn't one),
  mapping old roles into the new Admin/Manager model
- Adds `company_id` to `risk_categories`, `matrix_settings`, and `risks`

**All migrated users get `must_change_password = true`** — their old
password still works for one login, after which they must set a new one
meeting the policy above.

## Running everything with Docker Compose

```bash
docker compose up --build
```

This starts Postgres (with `schema_v2.sql` through `schema_v8_additions.sql`
auto-applied in order on first boot, fresh installs only) and the app
(which builds the React frontend as part of its image build).

## Health check

`GET /healthz` returns `{"status":"ok"}` if the app is up and can reach
the database (used by Cloud Run / load balancers in Phase 8 deployments).

## Environment variables

See `.env.example`:
- `DATABASE_URL` — Postgres connection string
- `SESSION_TIMEOUT_MINUTES` (default 10) — G8 idle timeout
- `LOCKOUT_MINUTES` (default 30) — G8 lockout duration
- `PASSWORD_MAX_AGE_DAYS` (default 90) — G8 forced rotation period

## Documentation

- `docs/ARCHITECTURE.md` -- architecture overview, multi-tenancy/auth
  model, ER diagram, and a module map from spec section to code (G11).
- `docs/API_REFERENCE.md` -- endpoint catalog grouped by module (G11).
- `docs/USER_GUIDE.md` -- onboarding and training for client staff,
  covering control tests, KRI breaches, issues, policy attestation, and
  admin workflows, plus a glossary (G12).
- `deploy/README.md` -- Cloud Run + Cloud SQL deployment guide (Phase 8).
- `docs/SCOPE_NOTES.md` -- consolidated list of deferred items and known
  limitations across all phases; the starting point for any Tier 2 work.

## Project status

**All 10 phases of the Tier 1 build are complete**: multi-tenant
foundation, the full risk/control/KRI module, Policy Repository + RACI,
Compliance Obligations, Issues & Actions Tracker, refined access control,
dashboards, bulk import/export/search/notifications, cloud deployment, and
per-client branding + documentation/training. See `docs/SCOPE_NOTES.md`
for what's deliberately deferred to Tier 2 and suggested next steps.
