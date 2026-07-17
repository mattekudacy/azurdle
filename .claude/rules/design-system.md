---
paths:
  - "src/app/**"
---

## Design System

### Layout & Structure

The game interface uses a **two-column layout** for optimal gameplay experience:

**Header Section:**
- Topbar (48px fixed height): Azurdle logo + brand name on left; Archive, Stats, Help buttons in center; Sign out on right
- Main header in content area: Title "Azurdle #X ServiceName" with category subtitle
- Session timer (HH:MM:SS format) displayed right-aligned in title row

**Game Area (two-column):**
- **Left column (55%):** Clue list + guess input bar
  - Scrollable clue list with numbered pills (1-5) in primary blue badges
  - Clues fade in as guesses reveal them (staggered ladder effect)
  - Dashed pipeline connectors between clues (visual dependency chain)
  - Input bar at bottom: autocomplete input + submit button (always visible, pinned)
  - Shake animation on wrong guesses (horizontal jitter, not red flash — misses are information)
  
- **Right column (45%):** Cloud Log (guesses history)
  - "Cloud Log" header with history icon + "LIVE FEED" badge
  - Scrollable list of guesses with badges/metadata
  - Each guess shows:
    - Service name in pill (red X icon for wrong guesses, no icon for correct)
    - Attribute grid below showing: category badge, launch year, model type (PaaS/IaaS/SaaS), pricing tier
  - Animates in as guesses are submitted (same reveal animation as clues)

**Result Section (game over only):**
- Result banner (green for win, subtle for loss) with result text
- Success message: "Solved on clue N! The answer was X."
- Failure message: "Out of guesses. The answer was X."
- Share button (copy to clipboard) below results
- Countdown timer to next puzzle

### Colors & Styling

- **Primary:** Microsoft Azure Blue for interactive elements (button, badges, focus states)
- **Accents:** Green wash background for win state, muted grays for neutral states
- **Icons:** X for wrong guesses (muted color), checkmark appearance for correct
- **Badges:** Category tags (COMPUTE, STORAGE, etc.), year badges, model type tags
- **Animations:**
  - Clue reveal: fade + slide up (260ms)
  - Miss highlight: border pulse on newly-revealed clue (900ms)
  - Input shake: horizontal jitter on wrong guess (320ms)
  - Result banner: reveal from bottom (220ms)

### Typography & Spacing

- Title: Geist Sans, 16px bold (puzzle #X and category)
- Monospace: Geist Mono for clue numbers, timer, guesses list (code-like precision)
- Standard body: Geist Sans, 15px for clue text
- Metadata/labels: 11-13px uppercase with letter spacing for Cloud Log headers
- Spacing: 12px gaps (var(--space-sm)), 16px paragraph spacing (var(--space-md))

### Responsive Design

- **Desktop (>680px):** Two-column layout with right panel at 45% width
- **Mobile (<680px):** Stacked vertical layout, right panel becomes row 2
- Topbar always visible at top
- Game area scrolls internally (pinned guess input on desktop, adapts on mobile)
