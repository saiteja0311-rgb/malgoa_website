# MALGOA — Backend & RBAC Architecture Recommendation

> **Status: Discussion document (Task 9). No backend code has been written. Awaiting explicit approval of a path before any implementation.**

## 1. The Goal

A Role-Based Access Control (RBAC) system with three tiers layered on top of the existing static site:

| Role | Access |
|---|---|
| **Super Admin** (1 account — site owner) | Hidden dashboard at `/confidential-admin`: site traffic, registered-member metrics, full unfiltered membership database. |
| **Board Member / Manager** (few accounts) | Approve / reject pending registrations; upload images to the Media & Milestones gallery; post new events. **Cannot** see Super Admin metrics. |
| **Registered Member** (many) | Read-only access to a future members-only area, after manual approval. |

## 2. Hard Constraints (from Part 1.1 + Task 9)

1. **Hostinger shared PHP hosting** — PHP + MySQL available; **no Node.js runtime**, no build pipeline.
2. **Client cannot run a DevOps stack** — solution must be near zero-maintenance.
3. **State Body must fully control the data** (member PII, registrations).
4. The public site stays **vanilla HTML/Tailwind-CDN/JS** — whatever we choose must be consumable from plain browser JavaScript (`fetch`).
5. Sensitive data → security matters: password hashing, HTTPS, no secrets in the static JS, rate-limiting on auth, audit trail for approvals.

## 3. The Three Viable Paths

### Path A — PHP + MySQL directly on Hostinger

Custom PHP endpoints (e.g. `/api/*.php`) backed by the MySQL database Hostinger already provides; sessions or JWT for auth; a PHP-rendered `/confidential-admin`.

| Dimension | Assessment |
|---|---|
| Setup effort | **High** — build auth, hashing, RBAC middleware, CRUD, admin UI, file uploads, CSRF, rate-limiting from scratch. |
| Monthly cost | **₹0 extra** — uses the hosting already paid for. |
| Learning curve | **High** if no PHP skills on the team; you own every security detail. |
| Security posture | Fully in your hands — which is also the risk. Easy to get session/CSRF/SQLi/upload handling subtly wrong. `password_hash()`/prepared statements are solid *if used correctly everywhere*. |
| Maintenance burden | **High** — PHP version bumps, patching, backups, your own bug fixes. Contradicts the "near zero-maintenance" constraint. |

### Path B — Supabase (managed Postgres + Auth + Storage) + vanilla JS frontend ✅ recommended

Supabase is a hosted backend: a managed Postgres database, a built-in **Auth** service (email/password, magic links, JWT), **Storage** for gallery uploads, and an auto-generated REST/realtime API. The static site talks to it with the official `supabase-js` browser library (loadable from a CDN — **no build step**, fully compatible with the current stack). Access rules live in the database as **Row-Level Security (RLS)** policies.

| Dimension | Assessment |
|---|---|
| Setup effort | **Low–Medium** — define tables + RLS policies + roles; wire `fetch`/`supabase-js` calls. No server to write or host. |
| Monthly cost | **₹0** on the free tier (500 MB DB, 1 GB storage, 50k monthly active users) — comfortably covers a State-Body membership for years. Paid tier ~US$25/mo only if you outgrow it. |
| Learning curve | **Medium** — concepts (RLS, policies, roles) to learn once, but no server code, no DevOps. Excellent docs. |
| Security posture | **Strong by default** — passwords hashed by the Auth service, JWT issued/verified for you, HTTPS, RLS enforces per-row access *in the database* so the three tiers can't bypass each other even if the frontend is tampered with. Only the **publishable/anon key** ships in the static JS (safe by design); the secret key never leaves the server side. |
| Maintenance burden | **Very low** — Supabase manages Postgres, patching, backups, scaling. Matches the "near zero-maintenance" constraint best. |
| Data control | You own the project; data is exportable any time; can self-host later if ever needed. |

The Super Admin dashboard and Board dashboard become small static pages gated by the member's role claim, with RLS ensuring (e.g.) only `super_admin` can read the metrics/full member table and only `board_member`+ can update a registration's `status` to approved.

### Path C — Headless WordPress as backend

Run WordPress on a subdomain (e.g. `admin.malgoa.org`) purely as CMS + auth + REST API; the static site consumes its REST endpoints. Roles map to WP roles (Administrator / Editor / Subscriber) — a near-perfect fit for the three tiers out of the box.

| Dimension | Assessment |
|---|---|
| Setup effort | **Medium** — 1-click install on Hostinger, then configure roles, JWT-auth plugin, and likely a custom plugin or ACF for the membership data model and approval workflow. |
| Monthly cost | **₹0 extra** (runs on existing hosting). |
| Learning curve | **Medium** — WP admin is familiar to non-technical board members (a real plus for "approve registrations" / "upload images" / "post events"), but exposing a clean members API needs plugins/config. |
| Security posture | **Medium** — WordPress is a large attack surface and the #1 mass-exploitation target; security depends on diligent core/plugin/theme updates and hardening. Auth plugins vary in quality. |
| Maintenance burden | **Medium–High** — frequent WP + plugin updates are mandatory for safety; neglected WP installs get compromised. Cuts against "near zero-maintenance." |

## 4. Recommendation — **Path B (Supabase)**

It is the only option that satisfies *all* the hard constraints at once:

- **No Node.js needed** — `supabase-js` runs in the browser from a CDN, so the site stays exactly as it is today (vanilla HTML/Tailwind-CDN/JS, no build).
- **Near zero-maintenance** — no server, OS, PHP, or WordPress to patch; backups and scaling are managed. This is the single most important constraint for a volunteer-run State Body.
- **Strongest default security** — hashing, JWT, HTTPS, and database-enforced **Row-Level Security** give genuine tier isolation without you hand-rolling auth. RLS means a tampered frontend still can't read another tier's data.
- **₹0 at this scale**, with full data ownership and a clean export/self-host escape hatch.
- The three roles map cleanly to a `role` column + RLS policies; the admin/board dashboards are just static pages reading role-scoped data.

**When Path B is *not* right:** if the board strongly prefers a familiar wp-admin GUI for day-to-day approvals/uploads and is willing to commit to disciplined updates, **Path C** is the pragmatic fallback. **Path A** is only worth it if there is in-house PHP expertise that wants total control and accepts the maintenance/security ownership.

## 5. Proposed shape if Path B is approved (for discussion — not built yet)

- Tables: `members` (profile + `status`: pending/approved/rejected + `role`), `events`, `gallery_assets`, `audit_log`.
- Auth: Supabase email/password; `role` stored as a custom claim / in `members`.
- RLS policies:
  - members read their **own** row only;
  - `board_member` can `update` `members.status` and `insert` into `events`/`gallery_assets`;
  - `super_admin` can read aggregate metrics + all rows.
- The public Join form (already built, currently `console.log` + `// TODO`) gets pointed at a Supabase `insert` into `members` with `status = 'pending'`.
- `/confidential-admin` and a `/board` page: static pages that require an authenticated session and the right role, otherwise redirect.

---
**Next step:** tell me which path you want (A / B / C). I will not write backend code until you approve one.
