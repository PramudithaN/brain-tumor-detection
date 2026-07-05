# NeuroScanAI - Visual Design Direction

## Rationale

The current UI reads as generic SaaS: default blue-gray palette, system font stack, soft rounded cards. Nothing about it says "MRI diagnostics." The direction below is grounded in two real things from the subject itself: **the radiology reading room** (dark viewing environment so scans read correctly, monospace data readouts like a DICOM console) and **the diagnostic heatmap convention** radiologists actually use to mark abnormal tissue (black → red → amber → white "hot" colormap). That's where the accent colors come from - not decoration, a real visual convention borrowed on purpose.

Apply this as a full restyle: colors, type, and the specific component changes at the bottom. Don't reuse Inter + blue-gray defaults anywhere in the rebuild.

---

## Color tokens

```css
:root {
  /* Base - reading-room dark, not pure black (keeps scan imagery readable) */
  --bg: #0A0B0D;
  --surface: #15171A;
  --surface-raised: #1C1F23;
  --border: #2A2D31;
  --border-strong: #3D4147;

  /* Text */
  --text-primary: #F2F1ED;      /* warm off-white, not clinical blue-white */
  --text-secondary: #9C9FA4;
  --text-muted: #6B6E73;

  /* Signal accent - cool, used for confidence, info, "clear" states */
  --signal-cyan: #5CC8FF;
  --signal-cyan-dim: rgba(92, 200, 255, 0.14);

  /* Heat accent - the diagnostic "detected" convention, used sparingly */
  --heat-red: #FF5A46;
  --heat-amber: #FFB238;
  --heat-glow: rgba(255, 90, 70, 0.16);

  /* Clear/benign result */
  --clear-mint: #4ADE9C;
}
```

**Per-classification mapping** (so each tumor type is visually distinct but stays inside the same system):
- Glioma → `--heat-red`
- Meningioma → `--heat-amber`
- Pituitary → `--signal-cyan`
- No tumor detected → `--clear-mint`

This replaces the single "everything is orange" alert styling in the current build - severity/type is now legible at a glance.

---

## Typography

Drop the system sans stack entirely. Use:

| Role | Typeface | Why |
|---|---|---|
| Display / headings | **Space Grotesk** (500–700) | Geometric, technical, slightly clinical without being cold |
| UI / body | **IBM Plex Sans** (400–500) | Literally designed for technical/scientific interfaces - fits a diagnostic tool honestly |
| Data readouts (confidence %, filenames, inference engine, coordinates) | **IBM Plex Mono** (400–500) | Renders numbers like a console/DICOM overlay - reinforces "this is instrument output," not marketing copy |

All three are free on Google Fonts.

```css
--font-display: 'Space Grotesk', sans-serif;
--font-body: 'IBM Plex Sans', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

Type scale:
- H1 (page title): 2.5rem / 600 / `--font-display` / -0.02em tracking
- H2 (section title): 1.375rem / 600 / `--font-display`
- Body: 1rem / 400 / `--font-body`
- Label / eyebrow (e.g. "DIAGNOSTIC CLASSIFICATION"): 0.75rem / 500 / `--font-body` / uppercase / 0.08em tracking / `--text-muted`
- Data value (confidence %, file size, engine name): `--font-mono`, tabular-nums

---

## Signature element

Replace the flat horizontal confidence bar with a **radial scan gauge** - a thin circular ring (like an MRI slice indicator) that fills clockwise to the confidence percentage, with the percentage in `--font-mono` centered inside it. During analysis, animate a horizontal scanline sweeping once across the uploaded image (mimics a slice being read) rather than a generic spinner.

This is the one place to spend visual boldness - keep everything else quiet and flat.

---

## Component-level changes

- **Cards**: `--surface` background, 1px `--border`, radius 12px (down from the current heavier rounding), no drop shadow - use a 1px inner highlight instead for a "panel" feel.
- **Buttons (primary)**: `--heat-red` → `--heat-amber` gradient background only for "Analyze," flat `--surface-raised` with `--border-strong` for secondary actions. No orange-everywhere.
- **Result badge**: colored dot (per classification mapping) + `--font-mono` label, not a large colored icon block.
- **Guest-mode / disclaimer banners**: flatten to `--surface-raised` with a left 2px accent bar in `--signal-cyan` (info) or `--heat-amber` (disclaimer) - remove the pastel blue/pink fills currently used.
- **"Understanding" info cards**: keep minimal - `--font-display` for the question, `--text-secondary` body, no icon circles.
- **Footer**: `--text-muted`, `--font-mono` for the copyright/year line to tie back to the console aesthetic.

---

## What to avoid

- No pastel/tinted backgrounds (light blue, light pink boxes) - flatten to dark surfaces with accent borders instead.
- No generic rounded-pill buttons with soft shadows.
- Don't default back to Inter or a system sans if the above fonts aren't available - fall back to IBM Plex specifically, not `-apple-system`.
