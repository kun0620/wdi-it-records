# WDI IT Records

IT operations log for a single-site factory: service requests, daily/weekly infrastructure checks,
maintenance records, asset handover and an IT document register. It replaces a Google Sheet +
Apps Script tool and keeps that sheet's audit-friendly rules, enforced in the database.

**Stack:** Next.js 16 (App Router, Server Actions) · Supabase (Postgres, Auth, Storage, RLS) · Tailwind CSS 4 · ExcelJS · Vercel

## What it does

| Page | |
|---|---|
| **Dashboard** | Open backlog by priority, week/month request figures, average resolution time, % daily checks completed, maintenance due status, 8-week trend and a 16-week daily-check heatmap |
| **Daily Check** | 7 infrastructure checks (firewall, WAN, VPN, core switch, Wi-Fi, CCTV, UPS) – one row per day; an NG result links to a prefilled incident |
| **Service Log** | Requests and incidents with auto-numbered `SR-YYYY-###`, priority P1–P4, escalation, close-out time in hours |
| **Export** | One-click `.xlsx` in the original workbook layout (daily file + month-end file) stored in a private bucket |

## Design decisions

- **The database enforces the rules, not the UI.**
  Records cannot be deleted (a trigger blocks `DELETE`, even through the API); cancel by status instead.
  Calculated fields (`hours`, `complete`, `ng_count`, `next_due`) are generated columns or views,
  so nobody can type over them. Request numbers come from a trigger with an advisory lock, so two
  editors never get the same number.
- **Append-only audit trail.** Every insert/update writes who, when and `{field: [old, new]}` to
  `it.audit_log`, which itself rejects updates and deletes. It is exported with every file.
- **Authorization lives in RLS.** `it.members` maps an email to `editor` or `viewer`; every table
  policy checks it. A user who can sign in but is not a member sees nothing.
- **Isolated schema.** Everything lives in schema `it`, so the app can share a Supabase project with
  another internal app without touching its tables.
- **Dashboard = one SQL function.** `it.dashboard(report_date)` ports the original sheet formulas
  (working days with Saturday/holiday settings, maintenance due windows, backlog age) and runs as
  the caller, so RLS still applies.
- **Business dates are Thai local dates** (`Asia/Bangkok`), never UTC.

## Project layout

```
supabase/migrations/   schema, RLS, triggers, dashboard function, storage bucket
scripts/xlsx_to_sql.py one-off importer from the legacy workbook (output is git-ignored)
src/proxy.ts           session refresh + redirect to /login
src/lib/               Supabase client, dates, dropdown lists, xlsx builder
src/app/(app)/         dashboard, daily, service, exports
```

## Running locally

```bash
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm install
npm run dev
```

Apply `supabase/migrations/*.sql` in order, add `it` to **Data API → Exposed schemas**, then add
yourself: `insert into it.members (email, role) values ('you@example.com', 'editor');`

Real company data is never committed: the importer writes to `data/` (git-ignored).
