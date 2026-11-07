---
target: Dashboard
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:F:\\gun\\Asset\\wdi-it-records\\src\\app\\(app)\\page.tsx"
target_fingerprint: "sha256:548d629144f90c1b8d3e7d47239461a61dd2196dba252ee72d4e8071c729ce23"
target_path: "F:\\gun\\Asset\\wdi-it-records\\src\\app\\(app)\\page.tsx"
timestamp: 2026-11-07T09-30-20Z
slug: src-app-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 23/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Heatmap shows pre-go-live weeks as "missed" |
| 2 | Real world match | 2 | Maintenance/service statuses in English caps (NOT DONE, DUE SOON, Waiting HQ) |
| 3 | User control | 3 | Rail avatar (30px) is the sign-out button |
| 4 | Consistency | 2 | 15 font sizes in main; 2 h1 + hero title; mixed link copy เปิด/ทั้งหมด/ดูทั้งหมด |
| 5 | Error prevention | 3 | "คำขอสัปดาห์นี้" KPI tag hard-coded ok (page.tsx:174) |
| 6 | Recognition | 3 | KPI sub-lines truncated; 10px heatmap labels |
| 7 | Flexibility | 2 | No search below 1024px; no shortcuts |
| 8 | Minimalist | 1 | Daily Check status shown 4x, P1 2x; 6 equal KPIs; all-zero by-type table; decorative hero rings |
| 9 | Error recovery | 2 | Load error = raw message, no retry; terse empty states |
| 10 | Help | 2 | Targets and heatmap semantics unexplained; title tooltips do not work on touch |

## Specificity
Category-interchangeable top half (gradient hero with rings + 6 identical KPI tiles). Product-specific: 16-week daily-check heatmap, P1-P4 mono badges, Thai+mono codes, all below the fold. Detector: 5 advisories, all page.tsx hero (font sizes 26/32px line 155; colors #7FD8A4 #F5C451 #FF8A8A lines 158/160). Overlay blocked (https page cannot load localhost script).

## Priority issues
1. [P1] Phone hides what needs attention: at 344px backlog starts at y≈1580, page 3046px tall, maintenance status column clipped in a sideways-scrolling table. Fix: phone-first "ต้องทำวันนี้" list; maintenance as stacked rows. /impeccable adapt + /impeccable layout
2. [P1] Redundancy + all-equal KPI row: Daily Check x4, P1 x2, six "ปกติ" pills; hard-coded ok tag. Fix: ≤4 figures, quiet when normal, colour only off-target; drop duplicated hero pills/sidebar card. /impeccable distill
3. [P1] Generic hero: gradient + rings, title repeats header. Fix: compact plant status strip for the 7 systems with the daily-check button. /impeccable layout (+ /impeccable bolder within DESIGN.md)
4. [P2] Heatmap marks pre-go-live days as missed (cls() in page.tsx); fixed 18px cells. Fix: neutral before first record; fluid cells. /impeccable harden
5. [P2] Type and language drift: 15 sizes incl. 8-10.5px; axis labels collide at 344; English statuses. Fix: snap to DESIGN.md scale, 11px min, Thai status labels. /impeccable typeset + /impeccable clarify

## Persona red flags
Alex: no search on rail/phone, no shortcuts, ~1850px page on a quiet day. Sam: no :focus-visible styles in design.css, no skip link, duplicate h1, heatmap one role=img. Casey: section links 41-68x20px top-right, 13/29 targets <44px desktop, 9/16 phone; sideways table scroll; 12px #5A6A7E sub-lines in factory light.

## Minor
"เวลาแก้เฉลี่ย –" with ok pill; asset bar colours mismatch pills; dark-mode sidebar merges with ground; "Backup ล่าสุด: Success" where a date is expected; by-type table capped max-w-md; data loads 3-8s on phone.
