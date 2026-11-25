# Web Best Practices Checklist

Walk through every table during the **Scan** phase. Mark each item Pass or Fail with specific evidence (file path, line number, measurement).

---

## HTML Quality

| # | Check | Pass/Fail | Evidence |
|---|-------|-----------|----------|
| 1 | Uses semantic elements (`<article>`, `<section>`, `<aside>`, `<figure>`) instead of generic `<div>` wrappers for content blocks | | |
| 2 | Heading hierarchy is sequential (h1 → h2 → h3) with no skipped levels | | |
| 3 | Exactly one `<h1>` per page | | |
| 4 | `<html>` has a valid `lang` attribute (e.g. `lang="en"`) | | |
| 5 | Every `<input>`, `<select>`, and `<textarea>` has a visible `<label>` with matching `for`/`id`, or `aria-label`/`aria-labelledby` | | |
| 6 | `<button>` used for actions, `<a>` used for navigation — no `<div onclick>` or `<a href="#">` as buttons | | |
| 7 | Every meaningful `<img>` has descriptive `alt` text; decorative images use `alt=""` | | |
| 8 | All `<img>` elements have explicit `width` and `height` attributes to prevent layout shift | | |
| 9 | No `<div>` soup: nested `<div>` depth does not exceed 6 levels without a semantic element | | |
| 10 | Page has landmark regions: `<header>`, `<nav>`, `<main>`, `<footer>` | | |
| 11 | HTML passes W3C validation with zero errors (warnings acceptable) | | |
| 12 | `<meta name="viewport" content="width=device-width, initial-scale=1">` is present | | |

---

## CSS Quality

| # | Check | Pass/Fail | Evidence |
|---|-------|-----------|----------|
| 1 | Colors, spacing, font sizes, and radii use design tokens (CSS custom properties) — no hex/rgb literals outside `:root` definitions | | |
| 2 | Zero instances of `!important` except in utility classes explicitly documented as overrides | | |
| 3 | No `transition: all` — every transition targets specific properties (e.g. `transition: opacity 200ms ease-out`) | | |
| 4 | Media queries are mobile-first (`min-width`) not desktop-first (`max-width`) | | |
| 5 | No horizontal page scroll at any viewport width from 320px to 2560px | | |
| 6 | Spacing uses consistent units — one of `rem`, `em`, or token-based `var()` — not mixed `px` for spacing | | |
| 7 | Logical properties used where text direction may vary (`margin-inline-start` over `margin-left` for i18n-ready layouts) | | |
| 8 | All animations and transitions wrapped in `@media (prefers-reduced-motion: no-preference)` or disabled under `prefers-reduced-motion: reduce` | | |
| 9 | Dark mode supported via `prefers-color-scheme` media query or class toggle, using token-level color switching | | |
| 10 | No CSS `@import` in production — stylesheets concatenated or use `@layer` for cascade management | | |

---

## JavaScript Quality

| # | Check | Pass/Fail | Evidence |
|---|-------|-----------|----------|
| 1 | Zero uses of `var` — all declarations use `const` (preferred) or `let` | | |
| 2 | Every `fetch`, `async` function, and Promise chain has a `.catch()` or `try/catch` with user-facing error handling | | |
| 3 | No `innerHTML` assignment with untrusted or user-supplied data — uses `textContent`, DOM APIs, or a sanitizer | | |
| 4 | Event delegation used for repeated elements (lists, tables) instead of per-element listeners | | |
| 5 | No render-blocking `<script>` in `<head>` without `async` or `defer` attribute | | |
| 6 | All third-party scripts loaded with `async` or `defer`; critical first-party scripts use `defer` | | |
| 7 | Event listeners cleaned up on component unmount / element removal — no orphaned listeners causing memory leaks | | |
| 8 | Deep cloning uses `structuredClone()` instead of `JSON.parse(JSON.stringify())` | | |

---

## Responsive Design

| # | Check | Pass/Fail | Evidence |
|---|-------|-----------|----------|
| 1 | Layout renders correctly at 360px viewport width (small phone) with no overflow or truncation | | |
| 2 | Layout renders correctly at 768px viewport width (tablet portrait) | | |
| 3 | Layout renders correctly at 1280px viewport width (laptop) | | |
| 4 | No horizontal page scroll at any tested viewport width | | |
| 5 | All touch targets (buttons, links, form controls) are at least 44×44 CSS pixels | | |
| 6 | Images use `srcset` and `sizes` attributes or `<picture>` element for responsive delivery | | |

---

## Forms

| # | Check | Pass/Fail | Evidence |
|---|-------|-----------|----------|
| 1 | Every input has a visible `<label>` — no placeholder-only labels | | |
| 2 | Inline validation shows specific error text adjacent to the invalid field (not just a red border) | | |
| 3 | Appropriate `autocomplete` attributes set on name, email, address, phone, and payment fields | | |
| 4 | Related inputs grouped with `<fieldset>` and described by `<legend>` (e.g. address fields, radio groups) | | |
| 5 | Error state uses `aria-invalid="true"` and `aria-describedby` pointing to the error message element | | |
| 6 | Success state provides visible confirmation feedback (toast, inline message, or redirect with status) | | |
