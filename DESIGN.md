---
name: Azurdle
description: A daily Azure-service guessing game for cloud-savvy players — built to feel like it lives inside the Azure Portal itself.
colors:
  bg: "oklch(1 0 0)"
  surface: "oklch(0.983 0.002 67.8)"
  ink: "oklch(0.24 0.002 67.7)"
  muted: "oklch(0.483 0.004 67.7)"
  primary: "oklch(0.568 0.167 251.3)"
  primary-hover: "oklch(0.461 0.132 250.3)"
  accent-wash: "oklch(0.51 0.165 142.7)"
  border: "oklch(0.905 0.003 67.8)"
  topbar: "oklch(0.568 0.167 251.3)"
typography:
  display:
    fontFamily: "Segoe UI, Geist, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Segoe UI, Geist, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Segoe UI, Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Segoe UI, Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  countdown:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  micro-badge:
    fontFamily: "Segoe UI, Geist, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "4px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 22px"
  clue-card:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    border: "1px solid {colors.border}"
  guess-input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: Azurdle

## 1. Overview

**Creative North Star: "Inside the Portal"**

Azurdle now deliberately looks like it lives inside the Azure Portal: real Azure Blue (`#0078D4`), a top bar carrying the wordmark like an app header, flat white panels with a thin neutral border and a soft ambient shadow for lift, and a Fluent-flavored small-radius corner system throughout. The audience already lives in this chrome forty hours a week — recognizing it immediately, on sight, is the point. This is a full reversal of the previous "anti-corporate-portal" direction; that system is retired.

**Key Characteristics:**
- Azure Blue as the single dominant brand color, carried on the top bar, primary actions, and clue-number badges
- Success Green reserved for the one moment a guess is correct
- Flat white cards, thin `border` stroke, and a soft ambient `--shadow-card` for depth — Fluent's card language, not a tonal-surface system
- A single fixed light theme — Azurdle does not follow the visitor's OS/browser dark-mode preference

## 2. Colors

Azure Blue is the whole brand; Success Green is held in reserve for the single celebratory moment in the whole experience.

### Primary
- **Azure Blue** (`oklch(0.568 0.167 251.3)` / `#0078D4`): The brand color. Used on the top bar, the primary "Guess" button, the clue-number badges, and any active/focused state.

### Secondary
- **Azure Blue Dark** (`oklch(0.461 0.132 250.3)` / `#005A9E`): Hover/active state for Azure Blue. Same hue, pulled darker.

### Tertiary
- **Success Green** (`oklch(0.51 0.165 142.7)` / `#107C10`): Reserved exclusively for the "correct guess" celebration banner. Never used for anything else.

### Neutral
- **Paper** (`oklch(1 0 0)` / `#ffffff`): Card and content background. Pure white.
- **Fluent Grey** (`oklch(0.983 0.002 67.8)` / `#FAF9F8`): Page background behind the card, warm-neutral in the Fluent tradition (not blue-tinted).
- **Ink** (`oklch(0.24 0.002 67.7)` / `#201F1E`): Body text, clue text.
- **Muted Ink** (`oklch(0.483 0.004 67.7)` / `#605E5C`): Secondary text — guess history chips, metadata line.
- **Border** (`oklch(0.905 0.003 67.8)` / `#E1DFDD`): The stroke around every card, input, and chip — this system's depth comes from borders + shadow, not tonal fills.

### Named Rules
**The One Theme Rule.** Azurdle ships one fixed light theme. It does not read or follow `prefers-color-scheme`.

**The One Flash Rule.** Success Green appears exactly once in the whole experience: the moment a guess is correct.

**The Same-Hue Interaction Rule.** Every hover/active/focus state on a colored element stays within the same hue, moving only in lightness (Azure Blue → Azure Blue Dark).

## 3. Typography

**Body Font:** Segoe UI (with Geist / `system-ui, sans-serif` fallback) — the Fluent/Portal system font.
**Label/Mono Font:** Geist Mono (with `ui-monospace, monospace` fallback), for the puzzle number and share-text square row only.

**Character:** A neutral system sans that reads as "in-product tool," not a marketing typeface. Geist Mono still carries fixed-width numerals (puzzle numbering, share-result squares) — a Fluent surface can still use a mono accent for data.

### Hierarchy
- **Display** (600, `clamp(1.75rem, 4vw, 2.25rem)`, 1.15): The "Azurdle" wordmark / page title only.
- **Title** (600, 20px, 1.3): Puzzle meta line and modal headings.
- **Body** (400, 16px, 1.5): Clue text, guess results, all prose.
- **Label** (600, 13px, 1.3, tracking `0.02em`): Form labels, guess-count indicator, button text.
- **Mono** (500, 14px, 1.4): Puzzle number badge, share-text square row.
- **Countdown** (600, 28px, 1.2, mono): The "next puzzle in" clock after a game ends.
- **Micro-badge** (600, 11px, 1.2, tracking `0.02em`): The "Soon" tag on disabled coming-soon affordances.

## 4. Elevation

Fluent-flat with real lift: cards are `Paper` with a 1px `Border` stroke and `--shadow-card` (a soft, tight ambient shadow — `0 1.6px 3.6px rgb(0 0 0 / 0.08), 0 0.3px 0.9px rgb(0 0 0 / 0.06)`), sitting on the `Fluent Grey` page background. This replaces the previous no-shadow, tonal-surface system entirely — Azurdle now uses the same "flat panel that visibly lifts off the canvas" language as the Azure Portal itself.

### Named Rules
**The Portal-Card Rule.** Every card-like surface (the main game panel, clue cards, how-to-play steps) is Paper + 1px Border + `--shadow-card`. Never a tonal-surface fill with no border, and never a heavier drop shadow than the defined `--shadow-card` token.

## 5. Components

### Top Bar
- **Style:** Full-width, 48px tall, solid Azure Blue background, white wordmark + logo (logo mark inverted to white via CSS filter since the source asset is itself Azure-Blue-on-transparent).
- **Purpose:** The single most direct "Azure Portal" signal — an app header bar exactly like the real product's chrome.

### Buttons
- **Shape:** 4px radius (`{rounded.md}`), Fluent's small-radius button standard.
- **Primary ("Guess"):** Azure Blue background, white text, 12px/22px padding.
- **Hover / Focus:** Background shifts to Azure Blue Dark on hover; press state scales down slightly (`scale(0.98)`); a 2px Azure Blue focus ring (offset 2px) on keyboard focus.
- **Disabled:** 50% opacity.

### Clue Cards
- **Corner Style:** 4px radius, matching buttons.
- **Background:** Paper, with a 1px Border stroke and `--shadow-card` lift — no tonal fill.
- **Distinctive element:** each clue leads with a small square (not circular) Azure-Blue badge holding its clue number in white Mono text.
- **Pipeline connector:** a short dashed vertical tick sits in the gap between consecutive clue cards, echoing an architecture-diagram dependency line.

### Inputs / Fields (Guess box + Autocomplete)
- **Style:** 1px Border stroke, Paper background, 4px radius, 16px body text.
- **Focus:** Border shifts to Azure Blue.
- **Autocomplete dropdown:** Paper background matching the input; active/hovered suggestion row uses a faint Azure-Blue tint (8% opacity) — Fluent's list-hover convention.
- **Already-tried suggestions:** Muted Ink text with an "Already tried" label, `cursor: not-allowed`.
- **Miss feedback:** the input row plays a brief horizontal shake on a rejected guess (duplicate or wrong) — a jitter, not a red flash; a miss is still information, not an alarm.

### Cloud Log (wrong-guess history)
- **Style:** Pill-shaped chips, Border stroke, Muted Ink text and icon.
- **The correct final guess** renders with no icon.

### Win / Loss Banner
- **Win:** Success Green fill, white text — the One Flash moment. Same 220ms reveal as before.
- **Loss:** Paper background with a 1px Border stroke — deliberately unstyled/neutral, matching a clue card's frame.
- **Result squares:** a 5-square row above the banner (Azure Blue for used clues, Success Green for the winning square, outlined/empty for unused guesses), staggered in ~80ms apart.

### Coming-Soon Affordances
- **Style:** Pill-shaped, outline-only, Muted Ink text, disabled cursor, "Soon" micro-badge.

### Next-Puzzle Countdown
- **Style:** Countdown type role (28px mono, Azure Blue), centered.

## 6. Do's and Don'ts

### Do:
- **Do** use real Azure Blue (`#0078D4`) as the single saturated brand color everywhere the brand shows up.
- **Do** give every card-like surface a border + `--shadow-card` — that combination is this system's entire depth language.
- **Do** keep the top bar solid Azure Blue — it's the fastest signal that this is "Azure Portal energy."
- **Do** keep Success Green reserved for the single correct-guess moment.

### Don't:
- **Don't** reintroduce a tonal-surface fill (a colored background with no border) as a substitute for the border + shadow card language — that was the old system.
- **Don't** use Success Green anywhere except the win banner and the winning result-square.
- **Don't** round corners past 4px on cards, buttons, or badges — pills stay pill-shaped (chips, coming-soon nav, "Soon" badge), but every square-ish surface stays tight and Fluent-flat.
- **Don't** add gradients, glassmorphism, or a heavier shadow than `--shadow-card` — this is "flat Fluent panel," not "elevated glass panel."
