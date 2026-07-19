# API Reference

A curated endpoint catalog (not a full OpenAPI spec, given the size of the
API -- see `docs/SCOPE_NOTES.md`). Grouped by module, in the order they
appear in `server.js`. "Role" is the minimum `requireRole(...)` -- routes
with no role listed are reachable by any authenticated user (Viewer
included), and a few are public (no authentication at all, noted
explicitly).

All routes except `/healthz`, `/api/branding`, `/api/auth/*`, and the SPA
fallback (`*`) require an active session and an active company
(`req.company`), and are department-scoped for Managers where the module
has a `department`/`applicable_to` field (see `ARCHITECTURE.md` section 2).

## System

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/healthz` | (public) | Liveness + DB connectivity check (Phase 8) |
| GET | `/api/branding` | (public) | Instance-wide branding for the login screen (G9) |

## Auth & session (G8)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | (public) | Email/password login; returns session token + companies |
| POST | `/api/auth/logout` | any | Destroys the current session |
| GET | `/api/auth/me` | any | Current user, companies (with roles/branding), active company |
| POST | `/api/auth/switch-company` | any | Sets the session's active company |
| POST | `/api/auth/change-password` | any | Change password (enforces policy, history, clears forced-change flag) |

## Company configuration

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/categories` | any | List risk categories for the active company |
| POST | `/api/categories` | Admin | Add a risk category |
| DELETE | `/api/categories` | Admin | Remove a risk category |
| GET | `/api/matrix/config` | any | Risk matrix dimensions + fiscal year start |
| POST | `/api/matrix/config` | Admin | Update matrix configuration |
| GET | `/api/companies/current/branding` | any | Current company's branding (G9) |
| PATCH | `/api/companies/current/branding` | Admin | Update logo/primary color (G9) |
| GET | `/api/taxonomies/:type` | any | List controlled-vocabulary terms (`cause` or `consequence`) |
| POST | `/api/taxonomies/:type` | Admin, Manager | Add a new term (available to everyone afterwards) |
| DELETE | `/api/taxonomies/:type` | Admin | Remove a term |

## Risk Register (B1)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/risks` | any | List risks (current version, department-scoped for Managers; excludes Closed risk chains unless `?include_closed=true`) |
| POST | `/api/risks` | Admin, Manager | Create a new risk (new version 1); auto-approved for Admin, "Awaiting Approval" for Manager |
| POST | `/api/risks/:id/approve` | Admin | Approve a Manager-submitted risk |
| POST | `/api/risks/:id/close` | Admin, Manager | Close a risk (new version, `risk_status='Closed'`, requires `closure_reason`) |
| POST | `/api/risks/:id/reopen` | Admin, Manager | Reopen a closed risk (new version, `risk_status='Active'`) |
| GET | `/api/risks/:uid/related` | Admin, Manager | List risks linked to this one as interdependencies |
| POST | `/api/risks/:uid/related` | Admin, Manager | Link this risk to another by UID, with an optional note |
| DELETE | `/api/risks/:uid/related/:otherUid` | Admin, Manager | Remove a risk interdependency link |

## Control Library (B2)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/controls` | Admin, Manager | List controls (department-scoped) |
| POST | `/api/controls` | Admin, Manager | Create a control |
| PATCH | `/api/controls/:id` | Admin, Manager | Edit a control |
| POST | `/api/controls/:id/link-risk` | Admin, Manager | Link a control to a risk (`risk_controls`) |
| DELETE | `/api/controls/:id/link-risk/:riskId` | Admin, Manager | Remove a control-risk link |
| POST | `/api/controls/:id/test` | Admin, Manager | Record a control test result; Partially Effective/Ineffective requires a remediation plan/owner/due date and auto-creates a pre-filled Issue (D) |
| GET | `/api/controls/:id/tests` | Admin, Manager | Test history for a control |

## Key Risk Indicators (B3)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/kris` | Admin, Manager | List KRIs with latest measurement, band, and sparkline history |
| POST | `/api/kris` | Admin, Manager | Create a KRI |
| PATCH | `/api/kris/:id` | Admin, Manager | Edit a KRI (incl. linked risks/controls) |
| POST | `/api/kris/:id/measurements` | Admin, Manager | Record a measurement; auto-creates an Issue on Red breach (D) |

## Users & Access (H2)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/users` | Admin | List users in the current company with roles/departments |
| POST | `/api/users` | Admin | Add a user to the company (creates the user if new, with a temp password) |
| PATCH | `/api/users/:userId` | Admin | Update a user's role/department/functional role |
| DELETE | `/api/users/:userId` | Admin | Remove a user from the company (blocked if they're the last Admin) |
| POST | `/api/users/:userId/active` | Admin | Activate/deactivate a user |

## Org Roles / RACI (A2)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/org-roles` | Admin, Manager | List the Role -> Person -> Department directory |
| POST | `/api/org-roles` | Admin, Manager | Add an entry |
| PATCH | `/api/org-roles/:id` | Admin, Manager | Edit an entry |
| DELETE | `/api/org-roles/:id` | Admin, Manager | Remove an entry |

## Policy Repository (A1)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/policies` | any | List policies (current version; Viewers see Published only) |
| GET | `/api/policies/:uid/history` | Admin, Manager | Version history for a policy |
| POST | `/api/policies` | Admin, Manager | Create a new policy (Draft, version 1) |
| PATCH | `/api/policies/:id` | Admin, Manager | Edit a Draft/Under Review policy (incl. links) |
| POST | `/api/policies/:id/transition` | Admin, Manager | Move through Draft -> Under Review -> Approved -> Published -> Archived (Approve/Publish are Admin-only) |
| POST | `/api/policies/:id/new-version` | Admin, Manager | Spawn a new Draft revision from a Published policy |
| POST | `/api/policies/:id/attest` | any | Record "I have read this policy" for the current user |
| GET | `/api/policies/:id/attestations` | Admin, Manager | Roster of who has/hasn't attested |

## Compliance Obligations (C1)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/obligations` | Admin, Manager | List obligations (department/`applicable_to`-scoped) |
| POST | `/api/obligations` | Admin, Manager | Create an obligation |
| PATCH | `/api/obligations/:id` | Admin, Manager | Edit an obligation (incl. links to policies/controls/KRIs/risks) |
| POST | `/api/obligations/:id/status` | Admin, Manager | Change compliance status; logs to `obligation_status_history` |
| GET | `/api/obligations/:id/history` | Admin, Manager | Status history for an obligation |

## Audit Log (G10)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/audit-log` | Admin, Manager | Append-only log of state changes across all modules |

## Issues & Actions Tracker (D)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/issues` | Admin, Manager | List issues (filterable by source type, department-scoped) |
| POST | `/api/issues` | Admin, Manager | Create an issue (manual self-identified, audit, regulatory, etc.) |
| PATCH | `/api/issues/:id` | Admin, Manager | Edit an issue (owner, due date, priority, links) |
| POST | `/api/issues/:id/status` | Admin, Manager | Change status, incl. closure (separation-of-duties check) and Risk Accepted disposition |

## Dashboards (F1/F2)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/dashboard/management-summary` | Admin, Manager | F1: summary cards, heatmap, top risks, appetite breaches, reassessment flags, risk movement, KRI alerts, open issues, compliance status |
| GET | `/api/dashboard/my-tasks` | any | F2: pending attestations, control tests due, my issues, policy reviews, my KRIs |

## Bulk Import (H1)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/import/:module/template` | Admin, Manager | Download a CSV template (header + example row) for `risks`, `controls`, `policies`, or `obligations` |
| POST | `/api/import/:module` | Admin, Manager | Import a CSV (`{csv: "..."}`), up to 1,000 rows; per-row success/error report |

## Data Export (H6)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/export/:module` | Admin, Manager | CSV export of `risks`, `controls`, `kris`, `policies`, `obligations`, or `issues` (scoped to caller's access) |

## Global Search (H8)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/search?q=...` | Admin, Manager | Search risks, controls, KRIs, obligations, issues, and policies by ID/name/keyword |

## Escalation Rules & Notifications (G5)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/escalation-rules` | Admin | List the company's escalation rules (one per trigger type) |
| PATCH | `/api/escalation-rules/:id` | Admin | Edit a rule's thresholds, notify/escalate targets, channels, active flag |
| GET | `/api/notifications` | Admin, Manager | Compute current notifications for the caller from active rules + live data |

## SPA fallback

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `*` | (public) | Serves `public/index.html` for any non-API path (client-side routing) |

---

## Common patterns

- **Errors**: `{ "error": "message" }` with an appropriate HTTP status
  (400 validation, 401 auth, 403 role/scope, 404 not found, 423 locked
  account, 503 for `/healthz` DB failure). Some 401 responses include a
  structured `code` (`PASSWORD_CHANGE_REQUIRED`, `NO_ACTIVE_COMPANY`) the
  frontend uses to redirect.
- **Pagination**: none of the list endpoints paginate -- they return the
  full result set for the company/department scope. Fine at SME data
  volumes; would need adding if a client's register grows very large.
- **Versioned entities** (`risks`, `policies`, `compliance_obligations`):
  list/get endpoints return the latest version per `*_uid`; edits insert a
  new version row rather than updating in place (G10).
- **Audit trail**: writes to `audit_log` happen inside the same request as
  the state change, via `logAudit()` -- not a separate async process.
