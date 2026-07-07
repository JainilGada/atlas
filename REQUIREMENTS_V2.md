# Atlas — Product & Design Requirements v2

**Project:** Atlas — Daily Challenge & Nutrition Tracker
**Version:** 2.0
**Date:** 2026-07-07

---

## 1. App Overview

Atlas helps you build streaks on personal challenges (fitness, habits, mindset) while tracking daily nutrition — all in one minimal, beautiful app.

**Core promise:** Show up every day. Track what you eat. Get better.

---

## 2. App Structure

```
App
├── Auth (OTP login — Gmail only)
├── Onboarding (first login only — 4 screens)
├── Main App
│   ├── Tab 1: Check-in  (challenges)
│   └── Tab 2: Nutrition (calorie tracking)
└── Settings (gear icon, top-right, on both tabs)
    ├── Profile
    └── Challenges
```

---

## 3. Design System

### 3.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#6C63FF` | CTA buttons, active tab, progress fill, links |
| `primary-light` | `#EDE9FF` | Chip backgrounds, subtle highlights |
| `success` | `#22C55E` | Completed check-ins, on-target calories, streak badges |
| `warning` | `#F59E0B` | Partial completion, approaching limit |
| `danger` | `#EF4444` | Over calorie goal, missed check-in |
| `info` | `#3B82F6` | Calorie deficit (good), AI feedback accent |
| `surface` | `#FFFFFF` | Cards, sheets, inputs |
| `background` | `#F7F7FB` | Page background (off-white, not pure white) |
| `border` | `#E5E7EB` | Dividers, input borders |
| `text-primary` | `#111827` | Headings, body copy |
| `text-secondary` | `#6B7280` | Subtext, hints, placeholders |
| `text-disabled` | `#D1D5DB` | Disabled states |

**Dark mode:** Not in scope for v0. Tokens should be set up so dark mode can be added later without refactoring.

---

### 3.2 Typography

**Font:** [Inter](https://fonts.google.com/specimen/Inter) — clean, modern, highly legible on mobile.

| Role | Weight | Size | Line Height |
|------|--------|------|-------------|
| Display (onboarding title) | 700 Bold | 28px | 1.2 |
| Page heading | 600 SemiBold | 22px | 1.3 |
| Section heading | 600 SemiBold | 17px | 1.4 |
| Body | 400 Regular | 15px | 1.6 |
| Label / caption | 500 Medium | 13px | 1.4 |
| Micro / helper | 400 Regular | 12px | 1.4 |

---

### 3.3 Spacing & Layout

- Base unit: **8px**
- Page horizontal padding: **16px**
- Card padding: **16px**
- Section gap: **24px**
- Minimum tap target: **44×44px**
- Border radius: **12px** (cards), **8px** (inputs, chips), **999px** (pills, badges)

---

### 3.4 Shadows & Elevation

| Level | Usage | CSS |
|-------|-------|-----|
| Low | Cards, inputs | `0 1px 3px rgba(0,0,0,0.08)` |
| Mid | Bottom sheets, FAB | `0 4px 12px rgba(0,0,0,0.12)` |
| High | Modals | `0 8px 24px rgba(0,0,0,0.16)` |

---

### 3.5 Iconography

- Library: **Lucide Icons** (open source, consistent stroke weight)
- Size: 20px standard, 24px for tab bar
- Stroke: 1.5px, color inherits from context

---

### 3.6 Illustration Style

- Simple, flat, single-color or duotone
- Use primary purple as accent color
- Friendly, not corporate
- Used only in: empty states, onboarding intro slide

---

## 4. Animations & Micro-interactions

### General Principles
- All transitions: **200–300ms**, ease-in-out
- Never animate more than 2 properties at once
- Respect `prefers-reduced-motion` — disable all decorative animations if set

### Specific Animations

| Trigger | Animation |
|---------|-----------|
| Tab switch | Fade + slight slide (150ms) |
| Bottom sheet open | Slide up from bottom (250ms, spring easing) |
| Bottom sheet close | Slide down (200ms) |
| Checkbox / task complete | Scale bounce (0.8 → 1.1 → 1.0, 300ms) + color fill |
| Progress bar fill | Width transition, ease-out, 400ms |
| Card appear | Fade in + slide up 8px (200ms, staggered 50ms per card) |
| Button tap | Scale down to 0.96 on press, release (100ms) |
| Input focus | Border color transition to `primary` (150ms) |
| AI feedback loading | Pulsing skeleton placeholder |
| OTP digit entry | Each digit box scales up briefly (80ms) on input |

### Challenge Completion Celebration
Triggered when the user marks the final task done on a given day's check-in **for a challenge that reaches 100% today**.

| Layer | Detail |
|-------|--------|
| Confetti burst | 60–80 particles, colors: `#6C63FF`, `#22C55E`, `#F59E0B`, `#EF4444`, `#3B82F6`. Burst from center-top, gravity fall, 2.5s duration. |
| Card flash | Challenge card background briefly flashes `success-light` (#DCFCE7) then returns (400ms) |
| Message toast | Bottom toast slides up: "🎉 [Challenge name] — Day X done! Keep going!" — auto-dismiss after 3.5s |
| Streak badge pulse | If streak milestone (7, 14, 21, 30 days), show large centered modal: "🔥 [X] Day Streak!" with confetti behind it and "Claim it" dismiss button |

---

## 5. Onboarding Flow (First Login Only)

Shown immediately after OTP verification if the user has no profile. 4 screens total.

### Screen 0 — Welcome / What is Atlas?

**Layout:** Full-screen illustration top half, text bottom half.

**Illustration:** Person with a checklist + bowl of food, clean flat style.

**Content:**
```
[Illustration]

Welcome to Atlas

Your personal coach for habits and nutrition.

• Set challenges and show up every day
• Track what you eat, understand your calories
• Get AI feedback tailored to your goals

[Get Started →]          [Skip for now]
```

- "Skip for now" shows a warning: "You can complete this later in Settings."
- Progress dots at bottom: ● ○ ○ ○

---

### Screen 1 — Goal & Body

**Heading:** "Tell us about yourself"
**Subtext:** "We use this to calculate your daily calorie goal."

**Fields:**
- Goal (segmented control, required): `Lose Weight` / `Maintain` / `Gain Muscle`
- Age (number input, required): placeholder "e.g. 25"
- Weight (number + unit toggle kg/lbs, required)
- Height (number + unit toggle cm/ft, required)

**CTA:** "Next →"
**Back:** "← Back"
Progress dots: ○ ● ○ ○

---

### Screen 2 — Diet Preferences

**Heading:** "Your food preferences"
**Subtext:** "So your AI suggestions always match your lifestyle."

**Fields:**
- Dietary preference (single-select pills, required):
  `None` / `Vegetarian` / `Vegan` / `Eggetarian` / `Jain` / `Keto`
- Allergies (multi-select chips, optional):
  `Gluten` / `Dairy` / `Nuts` / `Soy` / `Eggs` / `Shellfish` / `None`
- Disliked foods (free-text tags, optional): "e.g. mushrooms, olives"

**CTA:** "Next →"
**Back:** "← Back"
Progress dots: ○ ○ ● ○

---

### Screen 3 — First Challenge

**Heading:** "Set your first challenge"
**Subtext:** "A challenge is something you commit to doing every day."

**Examples shown as tappable suggestion chips (auto-fill on tap):**
`75 Hard` / `No Sugar` / `Daily Workout` / `Read 20 Min` / `Cold Shower`

**Fields:**
- Challenge name (text input, required): placeholder "e.g. No sugar for 30 days"
- Duration (segmented control): `30 days` / `60 days` / `75 days` / `Custom`
  - If Custom: number input appears
- Start date (date picker, default today)

**CTA:** "Start my journey 🚀"
**Back:** "← Back"
Progress dots: ○ ○ ○ ●

On submit → enter main app, Tab 1 (Check-in) active.

---

## 6. Main App — Navigation

### Bottom Tab Bar

| Tab | Icon (Lucide) | Label |
|-----|---------------|-------|
| Check-in | `CheckSquare` | Check-in |
| Nutrition | `UtensilsCrossed` | Nutrition |

- Active tab: `primary` color icon + label
- Inactive tab: `text-secondary` color
- Tab bar background: `surface` with top border `border`
- No badge/notification count in v0

### Top Bar (both tabs)
- Left: App logo + "Atlas" wordmark (small, 16px medium)
- Right: Gear icon → Settings

---

## 7. Tab 1 — Check-in

### State A: Has Active Challenges

**Top section:**
- Date header: "Today, Mon 7 Jul" (text-secondary, 13px)
- Motivational sub-line (rotates daily): e.g. "Small steps every day." / "Show up again." / "You've got this."

**Challenge cards (one per active challenge):**
```
┌─────────────────────────────────────┐
│ 75 Hard                    Day 4/75 │
│ ████████░░░░░░░░░░░░  5%           │
│                                     │
│ ☐ Outdoor Workout                   │
│   ☐ Warm-up 10 min                  │
│   ☐ Main workout              ›     │
│ ☐ Clean Eating                      │
│ ☐ Drink 4L Water                    │
│                                     │
│ [Mark all done]  3 of 5 complete    │
└─────────────────────────────────────┘
```

- Card bg: `surface`, border: `border`, shadow: low
- Progress bar: `primary` fill on `primary-light` track, 6px height, rounded
- Task checkboxes: 20×20px, border `border`, checked = `primary` fill with white tick
- Completed tasks: text `text-secondary` with strikethrough
- "Day X/Y" pill: `primary-light` bg, `primary` text, top-right of card
- "+ Add challenge" text link at bottom of list (primary color)

**When all tasks in a challenge are done:**
- Card border turns `success` green
- Progress bar turns `success` green
- Trigger celebration animation (see §4)

---

### State B: No Challenges

```
[Illustration: empty clipboard]

No challenges yet

Set a challenge to start your streak.

[+ Add your first challenge]
```

- CTA is a filled primary button, centered

### Add Challenge Bottom Sheet
- Slides up from bottom
- Fields: Name, Duration, Start date (same as onboarding Screen 3)
- CTA: "Add Challenge"

---

## 8. Tab 2 — Nutrition

### State A: Profile Complete

**Top summary card:**
```
┌───────────────────────────────────────┐
│ Today's Calories                      │
│                                       │
│  1,240 / 1,800 kcal consumed          │
│  ████████████░░░░░░░░░  69%           │
│                                       │
│  Burned: 320 kcal   Net: 920 kcal     │
│  Goal: 1,800 kcal   Balance: −880     │
└───────────────────────────────────────┘
```
- Balance shown in `info` blue if deficit, `danger` red if surplus, `success` green if within ±100 kcal
- Progress bar color mirrors balance color

**Meal slots (collapsible sections):**
```
▼ Breakfast  ·  420 kcal
  Dal Rice                           280 kcal  [edit] [delete]
  Banana                             140 kcal  [edit] [delete]
  [+ Add food]

▶ Morning Snack  ·  0 kcal
▼ Lunch  ·  ...
```

- Collapsed slots show kcal total only
- Expanded slot shows items + "+ Add food" at bottom
- Each food item row: name left, kcal right, swipe-left to delete

**Add Food Bottom Sheet:**
- Food name (text input, autofocus)
- Quantity hint (text input, optional): "e.g. 1 bowl, 200g"
- On save: AI spinner inline → kcal appears
- "+ Add sub-component" link to nest items

**Activity section (below meals, collapsible):**
```
▼ Activity
  Steps          [_____]  steps
  Water          [_____]  litres
  Strength       [_____]  min  [Light / Moderate / Heavy]
```

**AI Feedback button:**
- Appears after at least 1 meal logged
- Full-width outlined button: "Get today's AI feedback"
- Tap → loading state (skeleton) → feedback card expands below
- Feedback card: white bg, left border accent `primary`, formatted text

---

### State B: Profile Incomplete

- Top banner (amber): "Add your weight, age & goal to see your calorie target → Set up"
- "Set up" deep-links to Settings → Profile
- Food logging still works, no goal bar shown

---

## 9. Settings

Accessed via gear icon (top-right on both tabs). Full-screen push navigation.

### Settings — Profile

**Sections:**
- Body: Age, Weight, Height (with unit toggles)
- Goal: segmented control (Lose / Maintain / Gain)
- Diet: Dietary preference, Allergies, Disliked foods
- Save button (sticky at bottom)

On save → recalculates TDEE → updates calorie goal on Nutrition tab immediately.

---

### Settings — Challenges

- List of all challenges (active + archived)
- Each row: name, date range, status badge (`active` / `paused` / `archived`)
- Tap to expand: edit name, dates, archive / resume / delete
- "+ Add new challenge" button at top
- Archived challenges shown in a collapsed "Past Challenges" section

---

### Settings — Account

- Email (read-only)
- "Sign out" (danger red text button)

---

## 10. Empty States

Every empty state must have:
1. A friendly illustration (not a generic error icon)
2. A clear explanation in 1 sentence
3. A single CTA to fix it

| Screen | Empty state message | CTA |
|--------|--------------------|----|
| Check-in, no challenges | "No challenges yet. Set one to start your streak." | "Add challenge" |
| Nutrition, no meals | "Nothing logged yet today. Start with breakfast." | "Add food" |
| Settings challenges list | "No challenges created yet." | "Add your first challenge" |

---

## 11. Accessibility

- WCAG 2.1 AA minimum
- All interactive elements labeled for screen readers
- Color is never the only way to convey meaning (always paired with icon or text)
- Minimum contrast 4.5:1 for body text, 3:1 for large text / UI components
- Focus indicators visible (2px `primary` outline)

---

## 12. Figma Component Checklist

When building in Figma, create components for:

- [ ] Button (variants: primary filled / outlined / text / danger / disabled)
- [ ] Input (variants: default / focused / error / disabled)
- [ ] Chip / pill (variants: unselected / selected / multi-select)
- [ ] Card (variants: default / completed / highlighted)
- [ ] Progress bar (variants: default / success / warning / danger)
- [ ] Challenge card (states: empty / partial / complete)
- [ ] Bottom sheet (empty container — content varies)
- [ ] Tab bar (states: check-in active / nutrition active)
- [ ] Top bar
- [ ] Toast notification
- [ ] Empty state (illustration + text + CTA)
- [ ] Celebration modal (streak milestone)
- [ ] Onboarding screen template (progress dots + nav buttons)
- [ ] Skeleton loader (for AI content)

---

## 13. Screen Inventory (for Figma)

| # | Screen | Notes |
|---|--------|-------|
| 1 | Auth — Enter email | |
| 2 | Auth — Enter OTP | 6 digit boxes |
| 3 | Onboarding 0 — Welcome | Illustration, what is Atlas |
| 4 | Onboarding 1 — Goal & Body | |
| 5 | Onboarding 2 — Diet Preferences | |
| 6 | Onboarding 3 — First Challenge | |
| 7 | Check-in — Has challenges | |
| 8 | Check-in — No challenges (empty state) | |
| 9 | Check-in — All done (celebration state) | |
| 10 | Check-in — Add challenge sheet | |
| 11 | Nutrition — Profile complete | |
| 12 | Nutrition — Profile incomplete (banner) | |
| 13 | Nutrition — Add food sheet | |
| 14 | Nutrition — AI feedback expanded | |
| 15 | Settings — Profile | |
| 16 | Settings — Challenges list | |
| 17 | Settings — Account | |
| 18 | Streak milestone modal | 🔥 X Day Streak! |

---

## 14. Tone of Voice

- **Friendly, not preachy.** Never guilt-trip.
- **Short and clear.** No wall of text anywhere.
- **Encouraging.** Positive framing always (e.g. "Keep going!" not "You missed yesterday").
- **Human.** Write like a supportive friend, not a fitness robot.

---

*This document is the single source of truth for Figma design and frontend implementation.*
