---
name: Azurdle
description: A daily Azure-service guessing game for cloud-savvy players — Cloud-Native Gaming System with Minimalist foundation and Playful Gamification.
source: "Stitch: Azure Service Quest (projects/11529030756862062214)"
colors:
  bg: "#ffffff"
  surface: "#f9f9f9"
  ink: "#1a1c1c"
  muted: "#404752"
  primary: "#005faa"
  primary-hover: "#004883"
  primary-container: "#0078d4"
  secondary: "#465e90"
  tertiary: "#107c10"
  accent-wash: "#107c10"
  accent-ink: "#ffffff"
  attr-hit: "#107c10"
  attr-hit-ink: "#ffffff"
  attr-close: "#ffb900"
  attr-close-ink: "#424f44"
  attr-miss: "#d83b01"
  attr-miss-ink: "#ffffff"
  border: "#e1e1e1"
  border-light: "#f3f3f3"
  topbar: "#0078d4"
typography:
  display:
    fontFamily: "Space Grotesk, Geist, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Space Grotesk, Geist, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "normal"
  title:
    fontFamily: "Space Grotesk, Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Space Grotesk, Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Space Grotesk, Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
  mono:
    fontFamily: "IBM Plex Mono, Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.23
    letterSpacing: "0.05em"
  stat-mono:
    fontFamily: "IBM Plex Mono, Geist Mono, ui-monospace, monospace"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  micro-badge:
    fontFamily: "Space Grotesk, Geist, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
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
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "13px"
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
    fontFamily: "{typography.body.fontFamily}"
    fontSize: "15px"
  cloud-log-entry:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    border: "1px solid {colors.border}"
    fontFamily: "{typography.mono.fontFamily}"
    fontSize: "12px"
  attribute-grid-hit:
    backgroundColor: "{colors.attr-hit}"
    textColor: "{colors.attr-hit-ink}"
    rounded: "2px"
    padding: "4px 8px"
    fontSize: "11px"
  attribute-grid-close:
    backgroundColor: "{colors.attr-close}"
    textColor: "{colors.attr-close-ink}"
    rounded: "2px"
    padding: "4px 8px"
    fontSize: "11px"
  attribute-grid-miss:
    backgroundColor: "{colors.attr-miss}"
    textColor: "{colors.attr-miss-ink}"
    rounded: "2px"
    padding: "4px 8px"
    fontSize: "11px"
  guess-input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px 12px 40px"
    border: "1px solid {colors.border}"
    fontFamily: "{typography.body.fontFamily}"
    fontSize: "16px"
  result-banner-win:
    backgroundColor: "{colors.tertiary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "16px"
  result-banner-loss:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    border: "1px solid {colors.border}"
    fontFamily: "{typography.label.fontFamily}"
    fontSize: "16px"
---

# Design System: Azurdle

## 1. Overview

**Creative North Star: "Cloud-Native Gaming System"**

Applied from **Stitch project Azure Service Quest** (`projects/11529030756862062214`), this design system fuses **Corporate Modern** with **Playful Gamification**. It leverages Azure's trusted architectural foundations while injecting discovery and delight essential for a daily guessing game. The visual narrative centers on "The Cloud Log"—a clean, data-driven aesthetic that feels like a developer's console reimagined for leisure.

**Key Characteristics:**
- Azure Blue (`#005faa` deep, `#0078d4` primary) as the brand anchor, carried on the top bar, primary actions, and clue-number badges
- Success Green (`#107c10`) reserved for the celebratory "correct guess" banner
- Space Grotesk typography for a sharper, more contemporary "tech" feel (replaces Segoe UI)
- IBM Plex Mono for technical metadata, Cloud Log timestamps, and tag labels
- Clean surface grays (#f9f9f9 → #e1e1e1) creating a containerized look
- Soft 4px roundedness reflecting cloud service modularity
- Minimalist foundation with tactile accents—whitespace with subtle depth via tonal layering and sharp borders
- A single fixed light theme — Azurdle does not follow the visitor's OS/browser dark-mode preference

## 2. Colors

The palette is derived from Azure's core identity, expanded for game state feedback. Depth comes from borders and outlines, not tonal backgrounds—a "flat-plus" aesthetic maintaining architectural precision.

### Primary
- **Azure Blue Deep** (`#005faa`): Default primary color for interactive elements, focus states, and visual anchors.
- **Azure Blue** (`#0078d4`): Brand container, top bar, and active/hover lift.
- **Azure Blue Hover** (`#004883`): Pressed/active state—same hue, pulled darker for tactile feedback.

### Secondary
- **Navy** (`#465e90`): Typography grounding; secondary branding where not primary.

### Tertiary (State Feedback)
- **Success Green** (`#107c10`): The "correct guess" celebration banner. Reserved exclusively for success states.
- **Warning Gold** (`#ffb900`): Partial matches—correct category/model type but wrong service.
- **Error Red** (`#d83b01`): Incorrect guesses, failed states.

### Neutral Scale
- **Paper** (`#ffffff`): Card and content background. Pure white.
- **Surface** (`#f9f9f9`): Page background, Cloud Log panel background.
- **Surface Border** (`#f3f3f3`): Subtle container dividers.
- **Border** (`#e1e1e1`): Primary stroke around cards, inputs, and chips—tonal lift via 1px border + shadow, not fill.
- **Ink** (`#1a1c1c`): Body text, clue text, high-contrast content.
- **Muted Ink** (`#404752`): Secondary text, Cloud Log metadata, status indicators.

### Attribute Grid States
- **Hit** (`#107c10` on white): Exact match — service attribute matches answer.
- **Close** (`#ffb900` on dark): Partial match — year close or model type similar.
- **Miss** (`#d83b01` on white): No match — attribute differs significantly.

### Named Rules
**The One Theme Rule.** Azurdle ships one fixed light theme. It does not read or follow `prefers-color-scheme`.

**The Success Green Rule.** Success Green (`#107c10`) appears exactly once in the whole experience: the moment a guess is correct. Never for warnings or partial states.

**The Outline-First Rule.** Depth comes from 1px borders and soft shadows (`--shadow-card`), never from tonal-surface fills. Every card reads as a lifted object on the neutral background, not a step down into depth.

**The Same-Hue Interaction Rule.** Every hover/active/focus state on a colored element stays within the same hue, moving only in darkness (Azure Blue → Azure Blue Dark).

## 3. Typography

**Body Font:** Space Grotesk (with Geist / `system-ui, sans-serif` fallback) — modern, sharp, high-legibility sans for contemporary "tech" feel.
**Label/Mono Font:** IBM Plex Mono (with Geist Mono / `ui-monospace, monospace` fallback) for technical metadata, Cloud Log entries, and numerical data.

**Character:** Space Grotesk reads as contemporary and purposeful—not a marketing font, but a developer-centric aesthetic. IBM Plex Mono carries fixed-width precision for puzzle numbers, timestamps, and technical tags (Category, Year, Pricing) — reinforcing the "Cloud Log" data-driven theme.

### Hierarchy
- **Display** (700, 40px, 1.2, -0.01em): The "Azurdle #X" puzzle title and service name.
- **Headline** (600, 24px, 1.33): Category, section headers, modal titles.
- **Title** (700, 16px, 1.3, -0.01em): Puzzle meta line, key information headers.
- **Body** (400, 16px, 1.5): Clue text, guess results, all prose content.
- **Label** (600, 13px, 1.3, tracking `0.02em`): Form labels, button text, status indicators.
- **Mono** (500, 13px, 1.23, tracking `0.05em`): Cloud Log entries, Cloud Log metadata, technical tags.
- **Stat Mono** (700, 32px, 1.25): Large timer and statistics numbers.
- **Micro-badge** (600, 11px, 1.2, tracking `0.06em`): Attribute tags, category chips, year badges.

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
