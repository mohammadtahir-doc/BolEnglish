# Anti-Slop Design: Fix Recipes

Concrete before-and-after patterns for eliminating AI design tells and enforcing token discipline.

---

## 1. Semantic `<button>` Instead of `<div onClick>`

AI-generated components often attach `onClick` handlers to generic `<div>` wrappers for cards and toggles, breaking accessibility and keyboard navigation.

### ❌ Wrong Example
```jsx
// Div with click handler: invisible to screen readers, unreachable via keyboard Tab
<div onClick={handleSelect} className="p-4 rounded border cursor-pointer hover:bg-neutral-50">
  <h3>Professional Tier</h3>
  <p>$29/mo</p>
</div>
```

### ✅ Right Example
```jsx
// Semantic button with visible focus-visible ring
<button
  type="button"
  onClick={handleSelect}
  className="w-full text-left p-4 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-colors"
>
  <h3 className="font-semibold text-neutral-900">Professional Tier</h3>
  <p className="text-neutral-600">$29/mo</p>
</button>
```

### How to Verify
1. Run `node anti-slop-design/scripts/lint-design.mjs .` — verify `DIV_ONCLICK` rule passes.
2. Press `Tab` to navigate to the card; confirm the focus ring appears. Press `Enter` to activate.

---

## 2. Replacing Literal Colors with Design Tokens

AI models scatter random hex codes and Tailwind arbitrary colors (`bg-[#6366f1]`) across markup, creating fragmented palettes that break dark mode and consistency.

### ❌ Wrong Example
```html
<header class="bg-[#1e1b4b] text-[#e0e7ff] border-b border-[#312e81]">
  <h1 style="color: #4f46e5;">Console Dashboard</h1>
</header>
```

### ✅ Right Example
```css
/* In tokens.css */
:root {
  --color-surface-nav: var(--color-neutral-900);
  --color-text-nav: var(--color-neutral-50);
  --color-border-subtle: var(--color-neutral-800);
  --color-brand-primary: var(--color-brand-500);
}
```
```html
<header class="bg-[var(--color-surface-nav)] text-[var(--color-text-nav)] border-b border-[var(--color-border-subtle)]">
  <h1 class="text-[var(--color-brand-primary)] font-bold">Console Dashboard</h1>
</header>
```

### How to Verify
1. Run `node anti-slop-design/scripts/lint-design.mjs .`.
2. Confirm zero findings for `LITERAL_COLOR` and `LITERAL_COLOR_TAILWIND`.

---

## 3. Eliminating `transition: all` / `transition-all`

Animating "all" forces browsers to recalculate layout for non-composite properties (padding, width, height, colors), causing jank and sluggish interactions.

### ❌ Wrong Example
```css
.card {
  transition: all 0.3s ease; /* Transitions width, margin, padding, colors simultaneously */
}
```

### ✅ Right Example
```css
.card {
  /* Animate only composite-friendly properties */
  transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1),
              opacity 150ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

### How to Verify
1. Run `node anti-slop-design/scripts/lint-design.mjs .`.
2. Verify `TRANSITION_ALL` passes with zero findings.

---

## 4. Fixing Root Layout Overflow

Using `overflow-x: hidden` or `width: 100vw` on `html` or `body` breaks sticky positioning, disables pinch-to-zoom on iOS, and spawns horizontal scrollbars on Windows due to desktop scrollbar gutters.

### ❌ Wrong Example
```css
html, body {
  overflow-x: hidden; /* Breaks position: sticky across child views */
  width: 100vw;       /* Causes horizontal scrollbar equal to scrollbar width */
}
```

### ✅ Right Example
```css
html, body {
  overflow-x: clip; /* Safely clips subpixel layout bleed without breaking sticky */
  width: 100%;      /* Respects parent container width excluding scrollbar */
  margin: 0;
  padding: 0;
}
```

### How to Verify
1. Run `node anti-slop-design/scripts/lint-design.mjs .`.
2. Verify `OVERFLOW_HIDDEN_ROOT` and `WIDTH_100VW` pass.
3. Resize browser to 360px wide; confirm zero horizontal scrollbar appears.
