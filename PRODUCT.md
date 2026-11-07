# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the site's IT officer (one person, editor).** Runs IT for a single-site factory (WDI). Uses the app every working day to log service requests and incidents, record the daily infrastructure check, track weekly checks and maintenance, register and hand over assets, and keep the IT document register.
- Works in two scenes: on the move around the factory floor and offices on a phone (Galaxy Z Fold 5, folded and unfolded), and at a desk computer for tables, longer forms and exports.
- **Indirect: the General Manager.** Does not sign in; receives the exported `.xlsx` files (daily file + month-end file) in the original workbook layout.
- **Secondary: portfolio viewers.** The repo is public and the app is a portfolio piece, but daily use comes first; portfolio quality should come from craft in the details, not from showpiece decoration.

## Product Purpose

An IT operations log that replaces a Google Sheet + Apps Script tool. It keeps the sheet's audit-friendly rules (no deletes, calculated fields, append-only audit trail) enforced in the database, while making daily logging fast on a phone. Success: the IT officer records each day's work in seconds, finds any asset or request instantly, and hands the GM correct export files without rework.

## Positioning

A single-officer, factory-scale IT record where the database is the auditor: records cannot be deleted, calculated fields cannot be typed over, every change is logged with who/when/old→new, and exports reproduce the legacy workbook exactly.

## Operating Context

- Pages: Dashboard (backlog by priority, week/month figures, avg resolution time, % daily checks done, maintenance due, 8-week trend, 16-week daily-check heatmap, asset health), Daily Check (7 checks: firewall, WAN, VPN, core switch, Wi-Fi, CCTV, UPS; NG links to a prefilled incident), Weekly Check, Maintenance, Service Log (`SR-YYYY-###`, P1–P4, escalation, close-out hours), Assets (tags `WDI-<PC|NB|NW|CA|PR|AC|OT>-####`, QR labels, sortable table, handover), Handover (รับ-คืน), Documents register, Export, Login.
- QR labels on assets open the asset page (`/a/[tag]`); labels are printed from the app (label design still pending).
- Business dates are Thai local dates (Asia/Bangkok). Interface language is Thai with English technical terms and codes mixed in.
- Light and dark themes; follows the OS unless the user picks one.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router, Server Actions), Supabase (Postgres, Auth, Storage, RLS) in schema `it`, Tailwind CSS 4, ExcelJS, Vercel (functions in sin1).
- No delete anywhere (cancel by status). Calculated fields are read-only. Authorization lives in RLS (`it.members` editor/viewer).
- Public repo: never commit real company data (employee names, serials); demos use fake seed data.
- Planned later: company-wide Process Documentation module (hand-off flow cards, EN+TH), annual stock-take by QR scan, software/license register, attachments.

## Brand Commitments

- Name: "WDI IT Records". Thai-first UI copy.
- Export files keep the legacy workbook layout and form references (e.g. WDI-F-18-001).

## Evidence on Hand

- Real operating data lives only in Supabase and the local workbook `IT Asset & Records v2.xlsx`; it must not appear in screenshots or commits. No customer, metric or testimonial claims exist and none should be invented.

## Product Principles

1. Daily logging first: the most frequent tasks (daily check, new request, find an asset) are the fewest taps on a phone.
2. The record is the truth: show status, history and who-changed-what plainly; never imply something can be deleted or edited when it cannot.
3. Thai and codes together: Thai labels, English/technical codes and tags read cleanly side by side.
4. Same app on fold, phone and desk: layouts adapt; no feature is desktop-only except where a table genuinely needs width.
5. Portfolio through craft, not decoration.

## Accessibility & Inclusion

- Usable one-handed on a phone, outdoors/factory lighting; readable contrast in both themes. No specific standard mandated; target WCAG 2.2 AA.
