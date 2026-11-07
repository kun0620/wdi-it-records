---
name: WDI IT Records
description: IT operations log for a single-site factory, Thai-first, phone and desk
colors:
  control-navy: "#0F2A44"
  control-navy-raised: "#1A3D60"
  brand-steel-blue: "#1F4E78"
  signal-blue: "#2A78D6"
  signal-blue-hover: "#1F66BD"
  signal-blue-ink: "#1A5CAE"
  signal-blue-soft: "#E7F0FC"
  ground: "#F3F5F9"
  card: "#FFFFFF"
  card-sunken: "#F6F8FB"
  ink: "#0E1C2B"
  ink-secondary: "#3B4B5F"
  ink-muted: "#5A6A7E"
  line: "#E2E8F0"
  line-soft: "#EDF1F6"
  field-line: "#C9D3DF"
  side-ink: "#E3ECF6"
  side-muted: "#93ABC5"
  ok: "#22A05B"
  ok-solid: "#1E8E50"
  warn: "#E3A512"
  bad: "#D63A3A"
  bad-solid: "#C93030"
  p1-red: "#C62828"
  p2-orange: "#B95100"
  p3-blue: "#2563B5"
  p4-slate: "#5A6878"
  night-ground: "#0A1522"
  night-card: "#111F2F"
  night-ink: "#E8EEF6"
typography:
  page-title:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  card-title:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  kpi-number:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  table:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
  micro:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.04em"
  code:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 600
rounded:
  chip: "6px"
  control-sm: "8px"
  control: "10px"
  control-lg: "12px"
  card: "16px"
  hero: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-danger:
    backgroundColor: "{colors.bad-solid}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "40px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "20px"
  chip-filter:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 12px"
  chip-filter-on:
    backgroundColor: "{colors.brand-steel-blue}"
    textColor: "{colors.card}"
  priority-p1:
    backgroundColor: "{colors.p1-red}"
    textColor: "{colors.card}"
    typography: "{typography.code}"
    rounded: "{rounded.chip}"
    height: "22px"
  tag-chip:
    backgroundColor: "{colors.card-sunken}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.code}"
    rounded: "{rounded.chip}"
    height: "22px"
  nav-side:
    backgroundColor: "{colors.control-navy}"
    textColor: "{colors.side-ink}"
    width: "240px"
  nav-side-active:
    backgroundColor: "{colors.control-navy-raised}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "44px"
---

# Design System: WDI IT Records

## Overview

**Creative North Star: "The Plant Control Room"**

The app is the factory's IT control room: a dark navy frame around a calm, bright working area where every status reads at a glance. The frame (sidebar, phone top bar, login) carries the identity; the working area stays light, quiet and dense enough to hold a day's records. Colour is spent on state, never on decoration: green for OK, red for NG and P1, amber for due, blue for the one thing you can act on.

The system is Thai-first. Thai labels and English technical codes (SR numbers, asset tags, IPs) sit side by side, so one family covers both scripts and codes switch to a monospace face. Density is moderate: tables at 46px rows, cards with 20px padding, KPI numbers at 34px. Light and dark themes are both first-class and follow the OS unless the user picks one.

Recorded from the shipped code on 2026-11-07, before a refinement pass. Known weaknesses the refinement targets (not rules): the look reads as a generic admin template, information-heavy screens lack a clear reading order, phone use needs bigger and fewer controls, and pages added later drift from the system.

**Key Characteristics:**
- Navy frame, light working area, white cards on a cool grey ground.
- Single action colour (signal blue); state colours carry meaning only.
- Soft, generous rounding (10px controls, 16px cards) with ambient shadows.
- Thai + Latin in one family; codes in monospace.
- Three nav forms by width: top bar + drawer (phone), icon rail (tablet / unfolded Fold), full sidebar (desktop).

## Colors

A cool navy-and-steel palette with one bright blue for action and a fixed set of soft tinted pairs for status.

### Primary
- **Signal Blue** (#2A78D6): primary buttons, focused inputs, active rail item, current bar in charts, selected filter outline. Hover deepens to #1F66BD; text-on-light uses the ink variant #1A5CAE; soft tint #E7F0FC behind icon chips and focus rings.

### Secondary
- **Control Navy** (#0F2A44): sidebar, icon rail, phone top bar, theme colour. Raised navy (#1A3D60) marks the active sidebar item. Brand steel blue (#1F4E78) fills selected filter chips and the dashboard hero gradient.

### Neutral
- **Cool Ground** (#F3F5F9): page background.
- **Card White** (#FFFFFF) and **Sunken Card** (#F6F8FB): surfaces, table headers, read-only fields.
- **Deep Ink** (#0E1C2B), **Secondary Ink** (#3B4B5F), **Muted Ink** (#5A6A7E): text hierarchy.
- **Hairline** (#E2E8F0), **Soft Hairline** (#EDF1F6), **Field Line** (#C9D3DF): borders, row dividers, input strokes.

### Status
Each status is a tinted pair (background + foreground) used by pills and icon chips: ok (#E3F4EA / #13683A), info (#E5EFFC / #1B5BAA), warn (#FCF1D3 / #7E5100), orange (#FDE9DA / #A0430A), grey (#EBEEF2 / #4C5A6B), bad (#FCE4E4 / #AE2121), violet (#EEE8FB / #5A36B0). Solid ok (#1E8E50) and bad (#C93030) fill the OK/NG buttons. Priorities have their own solid badges: P1 #C62828, P2 #B95100, P3 #2563B5, P4 #5A6878.

### Dark theme
Ground #0A1522, cards #111F2F with a 1px border instead of shadow, ink #E8EEF6, accent lifts to #4A92EA with dark text on filled accent controls. Status pairs become translucent tints with light foregrounds.

**The State-Only Colour Rule.** Hue outside the navy frame and signal blue always means a state (ok, warn, bad, priority, category). Never use a status colour as decoration.

**The One Action Rule.** Signal blue marks what can be pressed or what is selected. A screen has one filled blue button per task.

## Typography

**Body Font:** IBM Plex Sans Thai (Thai + Latin, 400-700), system-ui fallback
**Code Font:** IBM Plex Mono (400-700) for SR numbers, asset tags, priority badges, serials

**Character:** A sober, engineered humanist pair: Plex Sans Thai keeps mixed Thai/English labels on one rhythm, Plex Mono makes codes scannable and distinct from prose.

### Hierarchy
- **Page title** (700, 22px, 1.3, -0.01em): the one heading per page, in the header bar (19px on phone).
- **Section title** (600, 17px, 1.35): card and panel headings.
- **Card title** (600, 15px, 1.4): sub-headings inside cards.
- **KPI number** (700, 34px, 1.05, -0.02em): dashboard figures, unit in a 15px suffix.
- **Body** (400, 14px, 1.5): forms, descriptions.
- **Table** (400, 13px): table cells; header cells 600 12px secondary ink.
- **Label** (600, 12.5px): field labels; hints 12px muted.
- **Micro** (600, 11px, 0.04em, uppercase): overlines and section dividers.

**The Code Is Mono Rule.** Every machine identifier (SR-YYYY-###, WDI-XX-####, S/N, IP) is set in IBM Plex Mono; Thai text never is.

## Layout

App shell by width (Tailwind breakpoints): under 640px a 56px navy top bar with a drawer menu; 640-1023px a 76px icon rail with labels under icons; 1024px and up a 240px sidebar plus a 68px white page header with title and search. Content sits on the cool ground with cards in CSS grids (`kgrid` 14px gaps) and a 28px desktop / 16px phone side gutter. Spacing steps observed: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28px. Tables scroll inside a bordered box with a sticky header and a frozen first column on wide data (asset list). Forms end in a sticky footer bar on phone. The layout was tuned for the Galaxy Z Fold 5 (folded = phone, unfolded = rail).

## Elevation & Depth

Hybrid: light theme lifts cards off the ground with a soft two-layer ambient shadow; dark theme replaces shadow with a 1px border because shadows disappear on navy.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px rgba(15,42,68,.05), 0 4px 14px rgba(15,42,68,.06)`): cards, KPI tiles.
- **Overlay** (`box-shadow: 0 12px 32px rgba(15,42,68,.16)`): dialogs, drawer, menus, over a scrim rgba(9,22,36,.48).
- **Focus ring** (`box-shadow: 0 0 0 3px #E7F0FC`): focused inputs, paired with a blue border.

**The Flat Frame Rule.** The navy frame never casts or receives shadow; depth exists only in the working area.

## Shapes

Soft and consistent: radius grows with the size of the thing. Chips and badges 6px, small buttons 8px, buttons and inputs 10px, large buttons 12px, cards and KPI tiles 16px, dashboard hero 20px; filter chips, status pills and counts are full pills. Borders are 1px hairlines; OK/NG choice buttons use a 1.5px stroke. Status pills carry a 6px dot before the label.

## Components

### Buttons
- **Shape:** gently rounded (10px), 40px tall; large 48px / 12px, small 32px / 8px.
- **Primary:** signal blue fill, white 600 14px text.
- **Secondary:** white with field-line border, ink text. **Ghost:** transparent, blue ink text. **Danger / Success:** solid bad / ok fills (used for NG/OK and confirmations; the app has no delete).
- **Icon button:** 40px square, 10px radius, hairline border; `plain` variant drops border and fill.

### Chips
- **Filter chip:** 32px pill, hairline border, secondary ink; on = steel-blue fill with white text; `sel` = blue outline on blue tint. Counts sit inside at 11.5px.
- **Status pill:** tinted pair from the Status palette, 24px, dot prefix; sizes sm 20px, lg 28px.
- **Priority badge:** solid P1-P4 colour, mono 12px bold, 22px, 6px radius.
- **Tag chip:** sunken card fill, hairline border, mono 11.5px; asset tags in tables use blue mono ink.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** card white on cool ground.
- **Shadow Strategy:** card rest shadow in light, 1px border in dark.
- **Internal Padding:** 20px (16px KPI tiles). Header row: title left, link or action right, 14px below.

### Inputs / Fields
- **Style:** 42px, 10px radius, 1px field-line stroke, white fill; textarea min 84px.
- **Focus:** blue border plus 3px blue-tint ring.
- **Error:** red border plus red-tint ring, 12px bold red message with icon. **Read-only:** sunken fill, dashed border.

### Navigation
- **Sidebar (desktop):** navy, 240px, brand block, 44px items with icon + Thai label at 14px; active item on raised navy with a light-blue icon; open-request count badge right-aligned; user block pinned bottom.
- **Icon rail (tablet / unfolded Fold):** 76px navy, icon in a 44x30 pill above a 10.5px label; active pill is signal blue.
- **Phone:** navy top bar with menu button and page title; drawer reuses the sidebar.

### OK / NG selector (signature)
Three equal 52px buttons (OK / NG / N/A) per check row in the daily and weekly checks; selected OK fills ok-solid, NG fills bad-solid, N/A fills grey. Compact variant 44px.

### Daily-check heatmap (signature)
A 16-week grid of 3px-rounded cells: ok green, warn amber, bad red, missing outlined, future faint, today outlined in ink.

## Do's and Don'ts

### Do:
- **Do** keep the navy frame (#0F2A44) for navigation only and the working area light.
- **Do** use one filled signal-blue button per task; other actions are secondary or ghost.
- **Do** set every SR number, asset tag, serial and IP in IBM Plex Mono.
- **Do** express status with the tinted pill pairs and priority with the solid P1-P4 badges.
- **Do** give every new page the same header, card radius (16px) and table box as existing pages.
- **Do** check both themes; in dark, swap card shadows for 1px borders.

### Don't:
- **Don't** use status colours (green, amber, red, violet, orange) as decoration or category colour without meaning.
- **Don't** add a delete action or a red destructive button for removing records; cancel by status.
- **Don't** introduce new radii, shadows or greys outside the tokens above.
- **Don't** set Thai text in the monospace face.
