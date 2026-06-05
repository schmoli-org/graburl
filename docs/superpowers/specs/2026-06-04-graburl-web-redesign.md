# GrabURL Web Redesign — Design Spec

**Date:** 2026-06-04
**Scope:** `web/` landing page only — no structural or content changes

---

## Overview

Swap the existing Apple-blue color identity for an ember-orange palette and replace the system font with Plus Jakarta Sans throughout. The wordmark splits "Grab" from "URL", with "URL" carrying the orange accent — a subtle nod to the "GrabURL → Grabber" sound-alike. The page structure and all copy remain unchanged.

---

## Color changes

Replace every occurrence of the blue variables with orange equivalents:

| Variable | Current | New |
|---|---|---|
| `--blue` (light mode) | `#0077ED` | `#E8420C` |
| `--blue-dark` (light mode) | `#0055C9` | `#C43509` |
| `--blue-light` (light mode) | `#4AB5FF` | `#FF7043` |
| `--blue` (dark mode) | `#0a84ff` | `#FF6534` |
| `--blue-dark` (dark mode) | `#0071e3` | `#E8420C` |

Rename the CSS variables from `--blue` / `--blue-dark` / `--blue-light` to `--accent` / `--accent-dark` / `--accent-light` to reflect the new meaning.

The warm off-white background (`--bg-alt`) shifts slightly from `#f5f5f7` (cool grey) to `#f7f5f3` (warm cream) in light mode only, to complement the orange palette.

### Coming soon badge

Change from a neutral grey pill to a warm-tinted pill:
- Background: `#fff4f0`
- Border: `1.5px solid rgba(232, 66, 12, 0.22)`
- Text color: `var(--accent)`

### App icon gradient

Change the SVG linear gradient stops used in the hero icon, nav brand icon, and footer icon:
- Stop 0%: `#FF7043` (light ember)
- Stop 100%: `#C83209` (deep ember)

The toolbar extension icon in the demo strip changes from `#0077ED` fill to `#E8420C`.

---

## Typography changes

Replace the font stack throughout with Plus Jakarta Sans, loaded from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Update the `html` font-family in `Layout.astro`:

```css
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
```

The system font remains as fallback — the page renders fine before the font loads.

---

## Wordmark split

In every place "GrabURL" appears as text (nav brand, footer brand, page `<h1>`), wrap "URL" in a `<span class="url">` and color it `var(--accent)`:

```html
Grab<span class="url">URL</span>
```

Add to `Layout.astro` global `<style>` (not scoped, so it applies everywhere):

```css
.url { color: var(--accent); }
```

The `<title>` tag and `<meta>` content keep the unsplit "GrabURL" string — this is purely a visual treatment.

---

## Glow / shadow updates

The hero icon drop shadow references blue today:
```css
box-shadow: 0 24px 64px rgba(0, 85, 201, 0.32), ...
```

Change the color to match the new palette:
```css
box-shadow: 0 24px 64px rgba(232, 66, 12, 0.22), 0 4px 16px rgba(0, 0, 0, 0.1);
```

The `.btn:hover` box-shadow (currently `rgba(0, 85, 201, 0.38)`) becomes `rgba(200, 53, 9, 0.35)`.

---

## Files changed

- `web/src/layouts/Layout.astro` — font import, CSS variable rename (`--blue*` → `--accent*`) + new values, `.url` rule
- `web/src/pages/index.astro` — update all `var(--blue)` / `var(--blue-dark)` / `var(--blue-light)` references to `var(--accent)` etc; icon gradient stops; wordmark spans; coming soon badge styles; demo strip icon fill; hero icon shadow

No new files, no dependency changes, no structural or content changes.

---

## Dark mode

Dark mode continues to work via the existing `@media (prefers-color-scheme: dark)` and `[data-theme='dark']` selectors. The dark-mode accent value (`#FF6534`) is a lighter ember so it reads well on `#1c1c1e` at the same contrast level the old `#0a84ff` provided.
