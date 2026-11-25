# Modern Patterns Reference

Load this file only when replacing a legacy pattern during the **Fix** phase. Use the modern replacement when it meets browser support requirements. Apply the fallback strategy when broader support is needed.

---

## Legacy → Modern Replacement Table

| Legacy Pattern | Modern Replacement | Browser Support | Fallback Strategy |
|---|---|---|---|
| **Custom modal with JS overlay, backdrop, focus trap, Escape handling** | Native `<dialog>` with `showModal()`. Provides built-in backdrop (`::backdrop`), focus trapping, Escape-to-close, and `close` event. | Baseline Widely Available (2022). Safe without fallback. | None needed. |
| **Tooltip library (Tippy.js, Popper.js) for positioned overlays** | CSS Anchor Positioning (`anchor-name`, `position-anchor`, `position-area`) + Popover API (`popover="hint"`, `popovertarget`). Note: `inset-area` was renamed to `position-area` in Chrome 129. | Anchor Positioning: check [webstatus.dev](https://webstatus.dev) for current status. Popover: Baseline Widely Available. | Use `popover` (safe). For anchor positioning, fall back to absolute positioning with JS `getBoundingClientRect()` in `@supports not (anchor-name: --x)`. |
| **Scroll position JS (IntersectionObserver for parallax, scroll-linked animations)** | CSS `scroll-snap` for snap points. `animation-timeline: scroll()` / `animation-timeline: view()` for scroll-driven animations. | scroll-snap: Widely Available (2021). Scroll-driven animations: Newly Available (2025). | scroll-snap: safe. Scroll-driven animations: use `@supports (animation-timeline: scroll())` and provide a static fallback (no animation) for unsupported browsers. |
| **Color manipulation library (chroma.js, polished, tinycolor)** | `oklch()` for perceptually uniform color definition. `color-mix(in oklch, ...)` for blending. `light-dark()` for theme-aware colors. | oklch: Widely Available (2023). color-mix: Widely Available (2023). light-dark: Newly Available (2024). | oklch, color-mix: safe. light-dark: use `@supports (color: light-dark(red, blue))` with a `prefers-color-scheme` media query fallback. |
| **Float hacks, negative margins, or JS for sub-layouts** | CSS `subgrid` for inheriting parent grid tracks. Container queries (`@container`) for component-scoped responsive layout. | subgrid: Widely Available (2023). Container queries: Widely Available (2023). | Both safe without fallback. |
| **`JSON.parse(JSON.stringify(obj))` for deep cloning** | `structuredClone(obj)`. Handles circular references, `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, and more. | Baseline Widely Available (2022). Safe without fallback. | None needed. |
| **Custom toggle component with JS state and ARIA** | `<input type="checkbox" switch>` for a native toggle switch with built-in semantics. | Not yet Baseline. Safari 17.4+ ships it; Chrome does not yet support it. `::thumb`/`::track` pseudo-elements are behind a flag in Safari. Check [webstatus.dev](https://webstatus.dev) for current status. Progressive enhancement only. | Use `<input type="checkbox">` as the base. Apply `switch` attribute for browsers that support it — it degrades to a standard checkbox elsewhere. Test in Safari. |
| **IntersectionObserver boilerplate for lazy rendering long lists** | `content-visibility: auto` with `contain-intrinsic-size` on list items or sections. Browser skips rendering of off-screen content automatically. | Baseline Newly Available (2025). Check [webstatus.dev](https://webstatus.dev) for Widely Available date. Safe in all major browsers today. | None needed. Use `contain-intrinsic-size: auto <estimated-height>` for best UX. |
| **`setTimeout(fn, 0)` or `requestAnimationFrame` for yielding to main thread** | `scheduler.yield()` to explicitly yield to the main thread and resume with the same priority, improving INP. | Not yet Baseline (Chrome 129+). Behind flag in other browsers. | Feature-detect: `if ('scheduler' in window && 'yield' in scheduler)`. Fall back to `setTimeout(fn, 0)` or `await new Promise(r => setTimeout(r, 0))`. |
| **jQuery `.on()` delegation or manual `removeEventListener` cleanup** | Native `addEventListener` with `{ signal }` option from an `AbortController`. Call `controller.abort()` to remove all listeners at once. | Baseline Widely Available (2021). Safe without fallback. | None needed. |
| **Complex custom datepicker component** | Native `<input type="date">`, `<input type="datetime-local">`, `<input type="time">`. Consistent cross-browser rendering since 2021. | Baseline Widely Available (2021). Safe without fallback. | Use native input as the base. Only add a custom datepicker if the design requires features native inputs do not support (date ranges, time zones, custom calendars). |
| **Multiple CSS `@import` chains causing sequential network requests** | CSS `@layer` for explicit cascade ordering. Concatenate stylesheets with a build tool and use `@layer base, components, utilities` for precedence control. | @layer: Baseline Widely Available (2022). Safe without fallback. | None needed. |

---

## Decision Criteria

Before replacing a legacy pattern, verify:

1. **Is the modern API Baseline Widely Available?** → Replace directly, no fallback needed.
2. **Is it Baseline Newly Available?** → Replace with `@supports` or feature detection, provide a lightweight fallback.
3. **Is it not yet Baseline?** → Use as progressive enhancement only. Keep the existing pattern as the base experience.
4. **Does the project have a custom browser support policy?** → Follow that policy instead of Baseline status.
5. **Does the replacement reduce bundle size or dependencies?** → Prefer it even if the legacy version still works, to reduce maintenance.

## Usage Notes

- When replacing a pattern, remove the legacy library from `package.json` only after confirming no other code depends on it.
- Test the modern replacement in both the primary and fallback code paths before marking the fix as complete.
- Record the replacement in `.devkit/web/state.json` under `decisions` with the legacy pattern, modern replacement, and reason.
