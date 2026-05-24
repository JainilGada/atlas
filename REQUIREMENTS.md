# Product Requirements Document

**Project:** Daily Habit & Nutrition Tracker
**Version:** 1.2
**Date:** 2026-05-25

---

## Platform & Technical Baseline

### Platform Strategy

Web-first, single codebase, cross-platform.

| Target | Delivery |
|--------|---------|
| Web (primary) | Responsive PWA — works on any modern browser |
| iOS | Wrapped web view (WKWebView) or Flutter web target |
| Android | Wrapped web view (WebView) or Flutter web target |
| Older platforms | Accessible via browser — no platform-specific features that break on older OS/browser versions |

**Tech choice recommendation (pick one at project start):**

| Option | Trade-off |
|--------|-----------|
| React + PWA | Best web-first ergonomics; wrap in Capacitor/Expo for native shell |
| Flutter (web + mobile) | Single compiled output; slightly heavier web bundle |

Whichever is chosen, no platform-exclusive features in v0 — every capability must work in a browser.

---

## Authentication

### OTP via Email (Gmail only — v0)

- Only supported auth method in v0.
- No passwords. No third-party OAuth (no Google Sign-In, Apple, Facebook, etc.).

**Flow:**
1. User enters their Gmail address (`@gmail.com` — validated client and server side).
2. Server sends a 6-digit OTP to that email (valid for 10 minutes, single-use).
3. User enters OTP → server issues a session token (JWT or secure cookie).
4. On expiry or logout, session is invalidated server-side.

**Constraints:**

| Rule | Detail |
|------|--------|
| Accepted domains | `@gmail.com` only in v0 |
| OTP validity | 10 minutes from issue |
| OTP attempts | Max 5 wrong attempts → OTP invalidated, must re-request |
| Re-request cooldown | 60 seconds between OTP sends to the same address |
| Session length | 30 days rolling (refresh on activity) |
| Multi-device | Allowed — same account can have sessions on multiple devices |

**Future (v1+):** Support additional email domains; optionally add OAuth providers as a separate, later decision.

---

## Data & Deletion Policy

### Soft Delete Only

- No hard deletes anywhere in the system — v0 and beyond.
- Every deletable entity has:
  - `deleted_at` — timestamp, `null` if active
  - `deleted_by` — user ID who triggered the delete
- Deleted records excluded from all queries by default via a base query filter.
- Deleted records never shown in the UI.
- Data can be restored by an admin (no user-facing restore in v0).
- Account deletion: sets `deleted_at` on the user + cascades soft-delete to all owned records.

---

## Feature 1 — Daily Challenge Task Tracker

### Overview

A customizable daily check-in system where authenticated users track completion of tasks across one or more active challenges. Tasks support unlimited nesting (task → subtask → sub-subtask). Inspired by Obsidian's TODO UX — minimal, fast, end-of-day ritual feel.

---

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| T1 | logged-in user | create multiple challenge lists | I can track different challenges simultaneously |
| T2 | logged-in user | add tasks with defined output types | each task captures the right kind of response |
| T3 | logged-in user | nest subtasks under any task, recursively | I can break down complex tasks into steps |
| T4 | logged-in user | open today's check-in and fill each task | I can log completion before sleeping |
| T5 | logged-in user | add a comment to any task or subtask | I can add context at any level |
| T6 | logged-in user | upload a photo or file from the app | I can log visual proof (e.g., workout selfie) |
| T7 | logged-in user | soft-delete a challenge or task | it disappears from my view but data is preserved |

---

### Challenge Configuration

| Field | Detail |
|-------|--------|
| Name | e.g., "75 Hard" |
| Description | Optional |
| Start date | Date picker |
| Duration | Number of days or open-ended |
| Status | `active` \| `paused` \| `archived` |
| `deleted_at` | Soft delete timestamp |

---

### Nested Task Structure

```
Challenge: 75 Hard
│
├── Task: Outdoor Workout               [yes/no]
│   ├── Subtask: Warm-up 10 min        [yes/no]
│   ├── Subtask: Main workout          [short_text]
│   └── Subtask: Cool-down stretch     [yes/no]
│
├── Task: Clean Eating                  [yes/no]
│   └── Subtask: No sugar              [yes/no]
│       └── Subtask: No hidden sugar   [yes/no]
│
├── Task: Drink 4L Water               [number]
├── Task: Indoor Workout               [yes/no]
└── Task: Upload Selfie                [single_photo]
```

### Task / Subtask Definition

| Field | Description |
|-------|-------------|
| `title` | Short label |
| `description` | Optional instruction |
| `output_type` | Enum — see below |
| `required` | Boolean — must complete to auto-check parent |
| `parent_id` | `null` for root; parent task ID for subtasks |
| `order` | Display order within siblings |
| `depth` | Auto-computed from parent chain; used for UI indentation |
| `deleted_at` | Soft delete timestamp |

**Parent completion rule:** parent auto-completes when all `required` children are complete. User can override and manually mark parent complete (configurable per task — strict vs. non-strict).

### Supported Output Types

| Type | Input | Example |
|------|-------|---------|
| `yes_no` | Toggle / checkbox | "Did you complete clean eating?" |
| `short_text` | Single-line text | "What workout did you do?" |
| `long_text` | Multi-line textarea | "Journal / notes" |
| `number` | Numeric + optional unit | "Litres of water" |
| `single_photo` | Camera or file picker | "Upload workout selfie" |
| `multiple_photos` | Multi-file image picker | "Upload before/after" |
| `single_file` | File picker | "Upload meal plan PDF" |
| `multiple_files` | Multi-file picker | "Upload evidence docs" |

---

### Daily Check-in Flow

1. User opens app → lands on **Today's Check-in** if incomplete.
2. Each active challenge shown as a card with its task tree.
3. Root tasks shown expanded; subtasks indented below parent — collapsible.
4. Each node renders its own input control based on `output_type`.
5. Each node has an optional **"Add comment"** field (collapsed by default).
6. Completion propagates upward: completing all required subtasks auto-checks the parent.
7. User submits check-in → entry timestamped, locked after configurable cutoff (default: next day 6 AM).
8. Before cutoff: editable. After cutoff: read-only.

---

### Streak *(deferred — not in v0)*

Streaks and calendar heatmap views are out of scope for v0. Data model must store daily completion state so streak calculation can be added later without migration.

---

### Non-Functional Requirements

- Offline-capable: queue submissions if no connectivity, sync on reconnect.
- File uploads: max 20 MB per file; supported formats — JPEG, PNG, HEIC, PDF, MP4.
- Task tree depth: no hard cap in data model; UI handles up to 5–6 levels with progressive indentation.
- Soft delete on all entities — challenges, tasks, subtasks, daily entries, file attachments.

---

## Feature 2 — Daily Calorie & Nutrition Tracker

### Overview

A structured daily food diary with AI-powered calorie estimation. Users log meals across predefined slots. Food can be a flat item or a nested dish with sub-components — user decides the granularity. Each item at every level shows its individual kcal.

---

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| N1 | logged-in user | log meals across defined slots each day | intake is organized by time of day |
| N2 | logged-in user | log a dish as a single item or break into components | I choose my level of detail |
| N3 | logged-in user | nest sub-dishes inside a dish | complex items like sandwiches are properly broken down |
| N4 | logged-in user | see kcal against every item and sub-item | I know exactly what contributes what |
| N5 | logged-in user | see daily total kcal, deficit, or surplus | I can track against my goal |
| N6 | logged-in user | log water, steps, and strength training | activity factors into net calories |
| N7 | logged-in user | receive AI feedback on my day's nutrition | I get personalized, actionable suggestions |
| N8 | logged-in user | set dietary profile and goal once | AI uses it every day without me repeating |
| N9 | logged-in user | soft-delete any food item or day entry | it disappears from view, data is preserved |

---

### Meal Slots

| Slot | Default Time Hint |
|------|------------------|
| Breakfast | 7–10 AM |
| Morning Snack | 10 AM–12 PM |
| Lunch | 12–3 PM |
| Evening Snack | 4–6 PM |
| Dinner | 7–10 PM |
| Late Night | Optional, user-added |

---

### Nested Dish Structure

```
Slot: Lunch
│
├── Dal Rice                                                            280 kcal
│   (logged flat — user chose not to break down)
│
├── Sandwich
│   ├── Brown Bread (2 slices)                                         140 kcal
│   ├── Filling
│   │   ├── Grilled Chicken (80g)                                      130 kcal
│   │   ├── Lettuce + Tomato                                            15 kcal
│   │   └── Mayonnaise (1 tsp)                                          35 kcal
│   └── Cheese slice (1)                                                70 kcal
│   Sandwich Total →                                                   390 kcal
│
└── Buttermilk (1 glass)                                                40 kcal

Lunch Total →                                                          710 kcal
```

### Nesting Rules

| Rule | Detail |
|------|--------|
| Leaf node | Has its own AI-estimated kcal |
| Parent node | kcal = sum of children (computed, no extra AI call) |
| Flat item | Logged without children — AI estimates as a single unit |
| Expanding a flat item | User can add sub-components at any time; flat estimate replaced by children sum |
| User override | Any AI kcal can be manually edited; `kcal_source` updates to `user_override` |

---

### Food Item / Dish Definition

| Field | Description |
|-------|-------------|
| `name` | Free-text (e.g., "Grilled Chicken 80g") |
| `quantity_hint` | Optional (e.g., "1 bowl", "2 slices", "200g") |
| `parent_id` | `null` for slot-level items; parent dish ID for sub-components |
| `slot` | Meal slot this root item belongs to |
| `kcal` | AI-estimated (leaf) or sum of children (parent) |
| `kcal_source` | `ai_estimated` \| `user_override` \| `computed_from_children` |
| `order` | Display order within siblings |
| `deleted_at` | Soft delete timestamp |

---

### AI Calorie Estimation

- Triggered on save of any leaf node.
- Input: item name + quantity hint + user dietary profile.
- Output: single kcal number for that leaf.
- Parent kcal computed client-side by summing children — no extra API call.
- Re-estimate: user can tap "Re-estimate" on any leaf to trigger a fresh AI call.
- Cache: same leaf description on the same day → cached response, no duplicate API call.

---

### Daily Summary

| Metric | Description |
|--------|-------------|
| `goal_kcal` | Target intake from user profile |
| `consumed_kcal` | Sum of all slot totals |
| `burned_kcal` | Estimated from steps + strength training |
| `net_kcal` | `consumed_kcal − burned_kcal` |
| `balance` | `net_kcal − goal_kcal` → surplus `+` or deficit `−` |

Color indicators on summary card: green = on target, red = over, blue = significant deficit.

---

### Activity Logging

| Field | Input | Notes |
|-------|-------|-------|
| Steps | Manual number entry | Future: Google Fit / Apple Health sync |
| Strength training | Duration (min) + intensity (light / moderate / heavy) | Used to estimate burn |
| Water | Litres or glasses | Optional; shown on summary, not calorie-linked |

---

### User Dietary Profile

Set once in **Settings → Nutrition Profile**.

| Field | Options |
|-------|---------|
| Goal | Weight loss / Maintenance / Muscle gain |
| Dietary preference | Vegetarian / Non-Vegetarian / Eggetarian / Vegan / Jain |
| Food allergies | Free-text multi-tag (e.g., "peanuts, gluten") |
| Disliked foods | Free-text multi-tag |
| Age / Weight / Height / Activity level | For TDEE calculation |

TDEE calculated using Mifflin-St Jeor formula; recalculated automatically on profile change.

---

### AI Feedback (End-of-Day)

Triggered manually ("Get Today's Feedback") or automatically at check-in.

- Macro balance assessment (where estimable)
- Alignment with stated goal (deficit achieved / missed)
- Positive reinforcement — what was good today
- One or two specific, actionable suggestions
- Preference-aware — Jain user never sees root vegetable suggestions; vegan user gets plant-protein tips
- Allergy-aware — flagged foods never appear in suggestions
- Hydration note if water was logged

---

### History & Trends *(v1+)*

- Daily log view: browse any past date, full nested meal breakdown + AI feedback.
- Weekly/monthly charts: kcal consumed vs. goal, deficit/surplus trend.
- CSV export.

---

### Non-Functional Requirements

- AI kcal estimation latency: target < 3s per leaf save; show inline spinner on that item only, rest of UI remains interactive.
- All nutrition data is private to the authenticated user.
- Soft delete on all entities — day logs, meal slots, food items, sub-dishes.
- Water and activity fields are optional — their absence does not block day submission.

---

## Shared / Cross-Cutting Requirements

| Area | Requirement |
|------|------------|
| Auth | OTP to Gmail only; no 3P auth; session valid 30 days rolling |
| Platform | Web-first PWA; single codebase; wrapped in web view for iOS/Android |
| Deletion | Soft delete only — `deleted_at` on every entity; no hard deletes |
| Notifications | Out of scope for v0 |
| Timezone | Stored UTC; displayed in user's local timezone |
| Accessibility | WCAG 2.1 AA minimum |
| Older platforms | All features accessible via standard browser; no native-only dependencies in v0 |
