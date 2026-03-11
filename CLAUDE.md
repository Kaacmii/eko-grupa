# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page website for **Eko Grupa DDD Pančevo** — a pest control company (deratizacija/dezinsekcija). No build system, no framework, no dependencies. Open `index.html` directly in a browser.

## File Structure

```
index.html          — Single HTML file, all sections in order
css/style.css       — All styles; mobile-first with CSS custom properties
js/main.js          — All interactivity; vanilla JS, 10 self-executing modules
assets/svg/         — 6 animated SVG pest icons (cockroach, rat, ant, mosquito, bedbug, wasp)
assets/images/      — Logo placeholder (logo.png — user must supply)
```

## Architecture

**CSS** uses CSS custom properties defined in `:root` (colors, spacing, typography, shadows). All colors must come from these variables — never hardcode hex values. The color system is: 3 greens as primary (`--green-dark`, `--green-main`, `--green-light`), gold (`--accent-gold`) for CTA buttons/badges only, red (`--accent-red`) for pest icons/warnings only.

**JS** (`main.js`) is structured as 10 IIFE modules, each handling one feature:
1. Nav (sticky shrink, hamburger, scroll spy, smooth scroll)
2. Scroll animations (Intersection Observer on `.animate-on-scroll`)
3. Count-up (stat numbers in "O nama")
4. Tabs (Usluge section — Deratizacija / Dezinsekcija)
5. Accordions (both `.accordion-trigger` and `.faq-trigger` share one factory)
6. Gallery (filter by category + vanilla lightbox with keyboard nav)
7. Testimonials slider (autoplay, swipe, dot navigation)
8. Contact form (inline validation + simulated submit success)
9. Back-to-top
10. DOMContentLoaded init

**Scroll animations**: add class `animate-on-scroll` to any element — it fades in with `translateY` when 15% enters the viewport. Once triggered, it stays visible (no reset).

## Content Rules

- **All text must be in Serbian Latin script with diacritics** (č, ć, š, ž, đ). This includes `alt` attributes, ARIA labels, error messages, placeholder text, meta descriptions — everything. Never use Cyrillic.
- `lang="sr-Latn"` is set on `<html>`.
- Google Fonts URLs must include `&subset=latin-ext` for diacritic support.

## Adding New Sections

1. Add `<section id="..." aria-labelledby="...">` inside `<main>` in `index.html`
2. Add a nav link in `.nav-links` pointing to the section `id`
3. Use `.section-padding` + `.container` + `.section-header` pattern for consistent spacing
4. Wrap animatable elements with `animate-on-scroll` class

## Placeholder Images

Placeholder images are implemented as inline SVG elements with CSS gradient backgrounds — not `<img>` tags pointing to missing files. This prevents broken image icons. When replacing with real photos, swap the SVG block for `<img loading="lazy" src="..." alt="...">`.
