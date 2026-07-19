# GRC Workstation — Beta V1.0
## Feature Overview

**Certitude Advisory Services**

This document describes, in plain business language, everything the GRC
Workstation does. It's organized by module so a reader can jump straight
to the area they care about. For how it's built, see `ARCHITECTURE.md`;
for step-by-step instructions, see `USER_GUIDE.md`.

---

## 1. Platform Foundation

**Multi-tenant by design.** One deployed instance can serve a holding
company and its subsidiaries as separate "companies," each with its own
risk register, controls, policies, and users — while sharing the same
login and infrastructure. A person can hold different roles in different
companies (e.g. Admin of one subsidiary, Manager of another) and switch
between them from the sidebar.

**Role-based access control.** Three roles govern what a person can see
and do:

- **Admin** — full access across the company: approves risks, publishes
  policies, manages users, configures escalation rules and branding, and
  can act across every department.
- **Manager** — full working access to their own department's risks,
  controls, KRIs, issues, and obligations; risks they create go to an
  Admin for approval. Enterprise-wide items (not tied to a specific
  department) are visible to every Manager.
- **Viewer** — read-only access to published policies (with the ability
  to formally acknowledge them) and a personal "My Tasks" list.

**Secure session management.** Email/password login with enforced
password complexity, reuse prevention (can't reuse your last 5
passwords), mandatory periodic rotation, and account lockout after
repeated failed attempts. Sessions time out automatically after 10
minutes of inactivity, with an on-screen warning before sign-out.

**Complete audit trail.** Every meaningful change — approvals, status
changes, role changes, branding updates, bulk imports — is recorded with
who did it, when, and what changed. Nothing is silently overwritten:
risks, policies, and compliance obligations are versioned, so corrections
create a new version rather than erasing history.

---

## 2. Risk Register

The heart of the platform — a structured, auditable record of every risk
the organization tracks.

**Guided risk capture.** New risks are entered through a step-by-step
form: identification (department, category, description, cause,
consequence, owner), inherent risk scoring, control selection, residual
risk scoring, treatment strategy and tolerance, a mitigation plan, linked
KRIs, and review scheduling.

**5×5 scoring matrix.** Both inherent (before controls) and residual
(after controls) risk are scored on a 1-5 likelihood × impact scale,
automatically classified into Low / Medium / High / Extreme bands with
color-coded badges throughout the app.

**Controlled vocabulary for causes and consequences.** Rather than free
text that fragments into dozens of near-duplicate phrases over time
("system outage" vs "IT failure" vs "technology disruption"), causes and
consequences are picked from a shared, editable list — pre-populated with
common categories (e.g. "Process - Lack of Control", "Financial Loss",
"Reputational Damage") and extendable by any Admin or Manager.

**Treatment strategies**, including Mitigate/Treat, Avoid, Transfer, and
Accept — with "Accept" requiring a documented rationale and sign-off from
someone other than the person proposing it (no self-approval).

**Risk appetite breach flagging.** Each risk can have an optional
numeric appetite threshold (1-25, matching the likelihood × impact
scale). If the current residual score ever exceeds that threshold, the
risk is automatically flagged "Exceeds Appetite" — both on the register
and on the Management Summary dashboard — so attention goes where the
organization itself said it should.

**Risk velocity.** Each risk can be tagged with how quickly it could
materialize once triggered (Immediate, Short-term, Medium-term, or
Long-term) — a fast-onset cyber risk and a slow-burning reputational risk
at the same score warrant very different responses, and this makes that
visible.

**Directional trend tracking.** Every time a risk is reassessed, the new
residual score is automatically compared to the prior version, producing
an INCREASED / DECREASED / STABLE trend indicator — no manual
calculation required.

**Risk movement (top movers).** The Management Summary surfaces the
risks whose score has changed the most since their last assessment, with
both the previous and current score and the direction of travel — turning
the version history into something a risk committee can act on directly.

**Reassessment nudges.** If a control linked to a risk is tested and
comes back non-Effective *after* that risk's residual score was last
assessed, the risk is automatically flagged "Reassess" — a gentle prompt
that the residual score may no longer reflect reality.

**Risk interdependencies.** Risks can be cross-linked to other related
risks with an optional explanatory note (e.g. "both stem from the same
legacy VPN appliance"), helping a risk committee see clusters instead of
isolated rows — without any complex scoring logic.

**Risk lifecycle.** A risk can be formally **Closed** with a documented
reason once it no longer applies (a project ended, a regulation changed)
— it disappears from the working register but its full history remains
available on request — and can be **Reopened** if circumstances change.
Both actions are versioned and audit-logged like any other change.

**Approval workflow.** Risks created by Managers enter the register as
"Awaiting Approval" and are visibly badged as such until an Admin
approves them; Admin-created risks are auto-approved.

---

## 3. Control Library

A standalone library of controls — the things the organization actually
*does* to keep risks in check — managed independently of risks and linked
to them many-to-many (one control can mitigate several risks, and one
risk can have several controls).

**Three control types**: Preventive (stops something from happening),
Detective (notices it after the fact), and Corrective (fixes it once
detected) — covering the full spectrum of control design.

**Manual or automated**, with a defined testing frequency (Monthly,
Quarterly, or Annual) so the platform knows when a control is due for
re-testing.

**Recorded test history.** Every test — whether a routine Self-Test or
an Internal Audit sample — is logged with its date, result, tester, and
notes, building a full effectiveness history per control over time.

**Effectiveness drives status — and action.** A control's status changes
*only* through a recorded test result (Effective, Partially Effective, or
Ineffective), never by manual override. Critically, if a test comes back
Partially Effective or Ineffective, the system **requires** a remediation
action plan — including who owns it and by when — before the test can be
submitted. That plan automatically becomes a linked Issue in the Issues &
Actions Tracker, fully pre-filled, so nothing falls through the cracks
between "we found a problem" and "someone is fixing it."

---

## 4. Key Risk Indicators (KRIs)

Early-warning metrics that signal a risk is trending toward (or away
from) becoming a real problem.

**Green / Amber / Red bands**, defined per KRI against either an internal
tolerance or a regulatory limit, with the direction of breach (higher-is-
worse or lower-is-worse) configurable per indicator.

**Trend sparklines.** Each KRI shows its recent measurement history at a
glance, so a single Red reading can be distinguished from a sustained
slide.

**Automatic escalation on breach.** When a KRI's latest reading falls
into the Red band, the system automatically logs an Issue referencing the
breach — so investigation and remediation are tracked from day one,
without anyone having to remember to raise it manually.

**Linked to risks and controls.** KRIs can be associated with the risks
they're an early-warning signal for, and the controls that influence
them, keeping the full risk story connected.

---

## 5. Policy & Procedure Repository

A version-controlled home for the organization's policies, with a full
lifecycle and a built-in acknowledgement process.

**Lifecycle states**: Draft → Under Review → Approved → Published →
Archived, with Approve and Publish reserved for Admins. Publishing a new
version automatically supersedes the previous one for read access, while
preserving the full version history.

**Policy attestation.** Staff can formally acknowledge "I have read and
understood this policy" with a single click — recorded with their name
and a timestamp. If a policy is updated, a fresh attestation is required
against the new version. Admins and Managers can see a roster of who has
and hasn't attested, ahead of an audit.

**Linked to risks and controls**, so a policy's relevance to specific
risk areas is explicit and traceable.

---

## 6. Organizational Roles (RACI)

A simple Role → Person → Department directory recording who is
Accountable, Responsible, Consulted, and Informed across the
organization's risk and control landscape — giving structure to "who do I
ask about this?" without a separate HR system.

---

## 7. Compliance Obligations Register

A register of specific regulatory requirements the organization must
meet, each tracked against a compliance status (Compliant, Partially
Compliant, Non-Compliant, or Not Yet Assessed).

**Full status history.** Every status change is logged with notes and a
timestamp, building an audit-ready record of "when did we become
compliant with this, and based on what."

**Automatic escalation on non-compliance.** A status change to
Non-Compliant automatically raises a linked Issue, ensuring remediation is
tracked.

**Linked to policies, controls, KRIs, and risks** — so a single
obligation's full compliance story (which policy covers it, which control
enforces it, which risk it relates to) is visible in one place.

---

## 8. Issues & Actions Tracker

The organization's central "things that need fixing" list, fed both
manually and automatically by every other module.

**Four sources**: Self-identified (logged by staff), Internal/External
Audit findings, KRI breaches (auto-created), and Regulatory
(auto-created from Non-Compliant obligations) — with control-test
failures also auto-creating issues as described above.

**Ownership, priority, and due dates** on every issue, with overdue items
(more than 30 days past due) surfaced prominently on the Management
Summary.

**Separation of duties.** The person who closes/verifies an issue must be
different from the person who owns it — enforced by the system, not just
policy.

**"Risk Accepted" disposition**, for the occasional decision not to fix
something — requires Admin approval, and an Admin can't approve their own
issue's acceptance.

**Linked to risks, controls, KRIs, and obligations**, so every fix traces
back to the thing it was fixing.

---

## 9. Dashboards & Reporting

**Management Summary** — a single combined view for executives and
compliance coordinators:

- A 5×5 residual-risk heatmap showing how many risks sit at each
  likelihood/impact combination.
- The top 10 risks by residual score, with trend indicators and approval
  status.
- **Risk Appetite Breaches** — risks currently exceeding their defined
  tolerance.
- **Reassessment Recommended** — risks where a control's test result
  suggests the residual score may be stale.
- **Risk Movement (Top Movers)** — the risks that have moved the most
  since their last assessment, in either direction.
- KRI health (Green/Amber/Red counts, with Red items named).
- Compliance status, overall and broken down by regulator.
- Open issues by priority, with anything more than 30 days overdue
  flagged.
- A Risk Accepted register — every formally accepted risk and issue, with
  rationale, approver, and next review date.

**My Tasks** — a personalized to-do list for every user: pending policy
attestations, control tests due, issues assigned to them, policy reviews
they own, and KRIs they're responsible for. The first place anyone should
look each day.

---

## 10. Data Tools

**Bulk import.** Download a CSV template (with example data) for Risks,
Controls, Policies, or Compliance Obligations, fill it in from an existing
spreadsheet register, and upload — with a per-row success/error report so
nothing is silently dropped. Up to 1,000 rows per import.

**Data export.** Export Risks, Controls, KRIs, Policies, Obligations, or
Issues to CSV at any time, scoped to what the requesting user can see —
useful for offline analysis, backups, or board packs.

**Global search.** A single search bar finds risks, controls, KRIs,
obligations, issues, and policies by ID, name, or keyword — across the
whole register in one query.

---

## 11. Notifications & Escalation

**Configurable escalation rules**, one per trigger type (overdue control
tests, KRI breaches, overdue issues, non-compliant obligations, policy
reviews due), each defining:

- How long before the first notification fires, and who receives it
  (the item's owner, the department manager, or all Admins).
- How much longer before it escalates further, and to whom.

Sensible defaults are pre-configured; Admins can tune them to match how
strictly the organization wants to be reminded.

**Notification bell.** A running list of everything currently needing
attention — overdue tests, Red KRIs, overdue issues, upcoming policy
reviews, non-compliant obligations — with escalated items clearly marked.

---

## 12. Branding & White-Labeling

Each client company can have its own logo and primary brand color,
applied to the login screen and throughout the application for every
user of that company — managed from a simple Branding page (logo upload,
color picker, live preview). This Beta V1.0 build is configured with
**Certitude Advisory Services'** branding.

---

## 13. Documentation & Onboarding

Every deployment ships with:

- **This feature overview**, for understanding what the platform does.
- **An architecture guide**, covering the technical design, data model,
  and module map.
- **A full API reference**, cataloguing every endpoint by module.
- **A user guide**, walking new staff through login, roles, completing a
  control test, responding to a KRI breach, logging and closing an issue,
  and policy attestation — plus a glossary of GRC terminology for people
  new to formal risk management.
- **A deployment guide**, for standing up a new client instance on Google
  Cloud Run and Cloud SQL.

---

## Summary

The GRC Workstation (Beta V1.0) takes an organization from "risks live in
someone's spreadsheet" to a structured, auditable, multi-user system where
risks, controls, KRIs, policies, compliance obligations, and remediation
issues are all connected — with the dashboards, escalation rules, and
appetite/lifecycle controls needed to keep that connected picture current,
not just accurate on the day it was entered.
