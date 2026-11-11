---
target: Daily Check
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:D:\\gun\\Asset\\wdi-it-records\\src\\app\\(app)\\daily\\page.tsx"
target_fingerprint: "sha256:dd6cccf0fd820830ed273538415ec3b4b66f5bf4b6290d64c2d84a99e6c0787d"
target_path: "D:\\gun\\Asset\\wdi-it-records\\src\\app\\(app)\\daily\\page.tsx"
timestamp: 2026-11-11T00-00-00Z
slug: src-app-app-daily-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser)
Note: written by hand (impeccable launcher not installed on this machine); fingerprint covers page.tsx only, DailyForm.tsx also in scope.

## Design Health Score: 22/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | NG banner inserted off-screen at top; saved day looks unsaved |
| 2 | Real world match | 3 | Page named 3 ways (เช็ครายวัน / เช็คประจำวัน · ห้อง Server / Daily Check); "รีพอท" |
| 3 | User control | 1 | Incident link discards unsaved results; "ทุกข้อ OK" overwrites set NGs |
| 4 | Consistency | 2 | System labels differ from Dashboard strip; 2nd filled-blue button; inline colours |
| 5 | Error prevention | 2 | NG without remark caught only server-side; save-then-incident order not enforced |
| 6 | Recognition | 3 | Hints per check; selected state clear |
| 7 | Flexibility | 2 | Bulk OK good; back-date via 30x17 icon; history hides missed days |
| 8 | Minimalist | 2 | State repeated 3x per check; 2.8 screens at 344 |
| 9 | Error recovery | 2 | 12px .ierr at bottom, not tied to field |
| 10 | Help | 3 | Good back-date/audit copy; no guidance on NG -> Incident order |

## Specificity
Content is product-specific; presentation is 7 identical form-builder cards, not the Control Room. Dashboard's 7-system strip not reused.
Detector: 1 advisory design-system-color DailyForm.tsx:101 (#A11D1D). Overlay: shell-only low-contrast (logo badge 1.4-4.3:1, search placeholder 3.3:1). Manual contrast: selected OK white on #1E8E50 4.17:1, primary white on #2A78D6 4.42:1 (fail AA at 14-15px; token-level, app-wide).

## Measured (344x882)
Page 2476px; 7 cards x 133px ~1000px; OK/NG/N/A 93x52; ทุกข้อ OK 320x48 at y=221; save 312x48 sticky; date input 30x17; history rows 42px; report buttons 40px; min text 11px. All-OK = 3 taps; one NG done right ~7 taps + 3 long scrolls.

## Priority issues
1. [P0] NG -> Incident link loses unsaved work; incident gets first NG system only, remark only if typed first, empty requester, mm/dd date (DailyForm.tsx:42,101). Fix: "บันทึก + เปิด Incident" save-then-redirect with all NGs, remark, requester=checker; dirty guard. harden + clarify
2. [P1] Phone: 2.8 screens, ทุกข้อ OK top-of-screen, 690 wastes width. Fix: compact row per check with 44px .okng.compact, drop duplicate pill, hints only on NG, ทุกข้อ OK into sticky footer, 2 cols >=640. adapt + layout
3. [P1] NG state off-screen (banner :91), remark red before input (:155). Fix: inline per-check remark on NG, neutral until save attempt, NG count in footer. distill + harden
4. [P2] No saved/clean state; re-save makes audit noise. Fix: dirty tracking, green "บันทึกแล้ว hh:mm · 7/7 OK" summary + แก้ไข. clarify + delight
5. [P2] Drift: labels vs Dashboard, 2nd primary button (page.tsx:49), 42px rows no chevron, missed days hidden, viewer disabled .okng unstyled, green/blue contrast. polish (+ extract shared tile)

## Personas
Casey: top-of-screen actions, hidden NG banner, data loss, tiny date icon. Alex: no keyboard flow, orphan UPS card, no "same as yesterday". Sam: remark lacks aria-invalid/describedby, .ierr not role=alert, two h1, viewer buttons look enabled. IT officer 07:30: fault path slowest, one global remark, no done moment, missed days invisible.

## Minor
Card title duplicates page title; date 12.5px muted; 7/7 shown 4 times; helper line always visible; CHECK_SYSTEM ups->Other, wan/core both Network/LAN; dark-mode white incident button brightest; rail label wraps at 690.

## Questions
1. Should the Dashboard strip itself be the Daily Check?
2. Auto-create a draft Incident on saving an NG day?
3. Move the weekly report to Export?
