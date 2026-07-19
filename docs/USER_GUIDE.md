# User Guide -- GRC Workstation

Welcome. This guide is written for people who are new to formal risk and
compliance processes -- no prior GRC experience assumed. If a term feels
unfamiliar, check the **Glossary** at the end.

## 1. Logging in

1. Go to the URL your administrator gave you (e.g.
   `https://risk.yourcompany.com`).
2. Enter the email and temporary password your administrator gave you.
3. **First login only**: you'll be asked to set a new password. Pick
   something you haven't used before -- the system remembers your last 5
   passwords and won't let you reuse them.
4. If you belong to more than one company (e.g. a holding company and a
   subsidiary), you'll see a company picker. Pick the one you want to work
   in -- you can switch later from the sidebar.

**Staying logged in**: for security, you'll be signed out automatically
after 10 minutes of inactivity. A warning appears shortly before that
happens, with a "Stay signed in" button.

## 2. What you'll see, depending on your role

| Role | What you can do |
|---|---|
| **Viewer** | Read published policies, acknowledge ("attest to") them, and see **My Tasks** -- your personal to-do list. |
| **Manager** | Everything a Viewer can do, plus: manage risks, controls, KRIs, issues, and compliance obligations **for your own department**. New risks you submit go to an Admin for approval. |
| **Admin** | Everything, across all departments, plus: approve risks, publish policies, manage users, configure escalation rules, and set company branding. |

Don't worry about memorizing this -- the menu on the left only shows what
you have access to.

## 3. Finding your way around

- **Sidebar (left)**: your main menu. Items only appear if your role can
  use them.
- **My Tasks**: your personal to-do list -- pending policy attestations,
  control tests due, your open issues, policy reviews due (if you're a
  content owner), and your KRIs. **This is the best place to start your
  day.**
- **Search bar (top)**: type at least 2 characters to search across
  Risks, Controls, KRIs, Compliance Obligations, Issues, and Policies by
  ID, name, or keyword.
- **Notification bell (top right)**: shows things that need your
  attention -- overdue control tests, KRIs that have breached into the Red
  zone, policy reviews coming due, overdue issues, and Non-Compliant
  obligations. Items marked "Escalated" have been outstanding long enough
  that they've also been flagged to your manager or an Admin (your Admin
  configures these rules -- see section 8).

## 4. How to complete a control test

A "control" is something your organization does to keep a risk in check
(e.g. "Quarterly Bank Reconciliation"). Periodically, someone needs to
test whether it's actually working.

1. Go to **Control Library** (or click through from a notification/My
   Tasks).
2. Find the control that's due for testing -- My Tasks will list it if
   it's overdue or due soon.
3. Open the control and click **Record Test**.
4. Work through the test checklist -- answer pass/fail for each question
   based on the evidence you reviewed.
5. Add any notes (e.g. "Sample of 5 transactions checked against bank
   statements, all matched").
6. Submit. The system automatically calculates an **effectiveness status**
   from your answers:
   - **Effective** -- everything checked out.
   - **Partially Effective** or **Ineffective** -- one or more checks
     failed.

**What happens next**: if the result is Partially Effective or
Ineffective, the system **automatically creates an Issue** in the Issues &
Actions Tracker, pre-filled with a reference back to this control test.
You don't need to separately remember to log it -- just make sure the
auto-created issue gets an owner and a due date (see section 6).

## 5. How to respond to a KRI breach notification

A KRI (Key Risk Indicator) is a number your organization tracks because
it's an early warning sign for a risk (e.g. "Number of failed login
attempts per week"). Each KRI has bands -- Green (normal), Amber (watch),
and Red (breach).

When a KRI's latest reading falls into the **Red** band:

1. You'll see a notification in the bell icon (and in My Tasks if you're
   the KRI's owner).
2. Open **Key Risk Indicators** and find the KRI -- the sparkline chart
   shows the recent trend so you can see whether this is a one-off spike
   or a sustained problem.
3. The system has **already created an Issue** for you (similar to the
   control test flow above) -- find it in the Issues & Actions Tracker,
   referencing this KRI breach.
4. Investigate why the breach happened, and use that Issue to track the
   remediation: assign an owner, set a due date, and record what's being
   done.
5. If the breach is ongoing, future Red readings won't create duplicate
   issues for the same underlying problem -- use the existing issue.

If a rule is configured with an escalation (see section 8) and the breach
remains unresolved past a set number of days, your department manager (or
an Admin) will also be notified.

## 6. How to log and close an issue

The **Issues & Actions Tracker** is the to-do list for "things that need
fixing." Issues can come from four places (the **Source Type** filter):

- **Self-identified** -- you noticed a problem and logged it yourself.
- **Internal/External Audit** -- raised during an audit.
- **KRI Breach** -- auto-created (see section 5).
- **Regulatory** -- tied to a compliance obligation that's gone
  Non-Compliant.

### Logging a new issue (self-identified)

1. Go to **Issues & Actions**, click **+ New Issue**.
2. Choose **Self-identified** as the source type.
3. Describe the issue, its root cause (if known), and a proposed
   remediation plan.
4. Assign an **owner** and a **due date**.
5. Set a **priority**.
6. Optionally link it to a related Risk, Control, KRI, or Compliance
   Obligation -- this keeps everything connected so an auditor can trace
   "why was this fixed" back to "what risk did it address."

### Closing an issue

1. Once the remediation work is done, open the issue and update its
   **status**.
2. **Separation of duties**: the person who closes/verifies an issue must
   be **different from the issue's owner** -- the system enforces this. If
   you're the owner, ask your manager (or another colleague) to verify and
   close it.
3. **Risk Accepted**: occasionally, the decision is made not to fix
   something (the cost outweighs the risk). This requires an **Admin** to
   approve the "Risk Accepted" disposition -- and an Admin can't approve
   their own issue's Risk Accepted status if they're also its owner.

## 7. How policy attestation works

Some policies (e.g. the Code of Conduct) require everyone to formally
acknowledge they've read and understood them.

1. Go to **Policy Repository**. Published policies are listed with their
   category, version, and review status.
2. Open a policy and read it.
3. Click **"I have read this policy"** -- this records your name and a
   timestamp.
4. If a policy is updated (a new version is published), you'll need to
   attest again -- your previous attestation was for the older version.

Admins and Managers can see a **roster** of who has and hasn't attested to
a given policy -- useful for following up with stragglers before an audit.

## 8. For Admins: configuring notifications & escalation

**Escalation Rules** (sidebar, Admin only) let you define, for each type
of overdue/breached item:

- **Notify after** -- how many days overdue (or, for policy reviews, how
  many days *before* the due date) before the first notification fires.
- **Notify** -- who gets that first notification: the item's **Owner**,
  the **Department Manager**, or all **Admins**.
- **Escalate after** -- if still unresolved this many additional days
  later, escalate.
- **Escalate to** -- who the escalation goes to.

Sensible defaults are pre-configured for every company. Adjust them to
match how your organization actually wants to be nagged -- e.g. a stricter
"escalate after 3 days" for KRI Red breaches versus "escalate after 14
days" for routine control test reminders.

## 9. For Admins: other settings

- **Users & Access**: add/remove people, set their role
  (Admin/Manager/Viewer) and department, deactivate accounts that no
  longer need access.
- **Branding**: upload your company's logo and set a primary color --
  applies to the login screen and throughout the app for everyone.
- **Import / Export**: bring in an existing Excel risk register, control
  list, policy list, or obligations list via CSV (download the template
  first, fill it in, upload it back). Export any module to CSV at any
  time for backups or analysis.
- **Audit Log**: a complete, append-only history of who changed what and
  when -- useful when an auditor asks "show me how this was approved."

---

## Glossary

| Term | Meaning |
|---|---|
| **Risk** | Something that could go wrong and affect the organization's objectives. |
| **Inherent risk** | How bad the risk would be with *no* controls in place. |
| **Residual risk** | How bad the risk is *after* accounting for current controls -- this is the number that matters day-to-day. |
| **Likelihood / Impact** | The two scores (1-5) multiplied together to produce a risk score, shown as Low/Medium/High/Extreme. |
| **Control** | An activity that reduces a risk (e.g. a review, an approval step, an automated check). |
| **Control test** | A periodic check that a control is actually working as intended. |
| **Effectiveness** | The result of a control test: Effective, Partially Effective, or Ineffective. |
| **KRI (Key Risk Indicator)** | A metric tracked as an early-warning signal for a risk, with Green/Amber/Red bands. |
| **Issue** | A tracked problem with an owner, due date, and remediation plan -- the organization's "to-do list" for fixing things. |
| **Risk Accepted** | A formal decision (Admin-approved) to knowingly leave a risk/issue unaddressed. |
| **Compliance Obligation** | A specific regulatory requirement the organization must meet, with a status (Compliant / Partially Compliant / Non-Compliant / Not Yet Assessed). |
| **Policy attestation** | A staff member formally confirming they've read and understood a policy. |
| **RACI** | Accountable / Responsible / Consulted / Informed -- who owns, does, advises on, and is told about something. |
| **Department scoping** | Managers see and manage records for their own department; enterprise-wide items (no department set) are visible to all Managers. |
| **Escalation** | If something stays unresolved too long, notifying someone more senior in addition to the original owner. |

---

If something in the app doesn't match this guide, or you hit an error you
don't understand, contact your Admin -- they can check the Audit Log for
exactly what happened and when.
