# Performance Reference

Load this file during the **Performance Tune** phase (Full mode) or **Verify** phase (Quick mode).

---

## Core Web Vitals Targets

| Metric | Target | What It Measures | Common Failure Causes |
|--------|--------|------------------|----------------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Time until the largest visible element (hero image, heading block, video poster) finishes rendering | Unoptimized hero image, render-blocking CSS/JS, slow server response (TTFB > 800ms), lazy-loading the LCP element |
| **INP** (Interaction to Next Paint) | < 200ms | Worst-case delay between user input (click, tap, keypress) and the next frame update | Long main-thread tasks (> 50ms), synchronous layout thrashing, heavy event handlers without yielding |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Total unexpected layout movement during the page's lifetime | Images without dimensions, injected banners/ads above viewport, dynamically loaded fonts causing reflow, late-loading content |

---

## Images

| Requirement | Implementation |
|-------------|----------------|
| Use modern formats | Serve WebP with AVIF where supported; use `<picture>` with `<source type="image/avif">` and `<source type="image/webp">` with `<img>` fallback |
| Set explicit dimensions | Every `<img>` has `width` and `height` attributes matching the intrinsic aspect ratio to prevent CLS |
| Lazy load below fold | Add `loading="lazy"` to all images not in the initial viewport. Never lazy-load the LCP image |
| Responsive delivery | Use `srcset` with width descriptors and `sizes` attribute to deliver appropriately sized images per viewport |
| Proper sizing | Serve images at no more than 2× the displayed CSS pixel dimensions. A 300×200 CSS image needs at most a 600×400 source |
| LCP image priority | Set `fetchpriority="high"` on the LCP image. Remove `loading="lazy"` from it |

---

## Fonts

| Requirement | Implementation |
|-------------|----------------|
| Self-host or subset | Download font files and serve from your domain, or subset to only used character ranges using tools like `glyphhanger` |
| Font-display | Use `font-display: swap` in every `@font-face` declaration to prevent invisible text during load |
| Preload critical font | Add `<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>` for the primary body font |
| Limit families | Use at most 2 font families. Each additional family adds ~20-100KB and a network request |
| Use WOFF2 | Serve only WOFF2 format — it has the best compression and is supported by all modern browsers |

---

## Loading Strategy

| Requirement | Implementation |
|-------------|----------------|
| Critical CSS inline | Inline the CSS needed for above-the-fold content in a `<style>` tag in `<head>`. Load the rest asynchronously with `<link rel="stylesheet" media="print" onload="this.media='all'">` or via JS. Note: the `onload` handler is an inline event attribute — if the project has a strict CSP blocking inline scripts, use a preload pattern instead: `<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">` with a `<noscript>` fallback, or load the stylesheet via a small external script. |
| Defer non-critical JS | Use `<script defer>` for all non-critical JavaScript. Use `<script async>` only for independent analytics or third-party scripts |
| Preload key resources | Add `<link rel="preload">` for the LCP image, critical font, and any above-the-fold resource discovered late by the browser |
| Fetch priority | Set `fetchpriority="high"` on the LCP element (image or background). Set `fetchpriority="low"` on below-fold images and non-critical scripts |
| DNS prefetch | Add `<link rel="dns-prefetch" href="https://third-party.com">` for each third-party origin used on the page |

---

## Layout Stability

| Requirement | Implementation |
|-------------|----------------|
| Reserve image space | Always set `width` and `height` on `<img>` and `<video>` elements, or use `aspect-ratio` in CSS |
| Reserve embed space | Wrap iframes and embeds in a container with explicit `aspect-ratio` or `min-height` |
| No above-fold injection | Never insert banners, cookie notices, or ads above existing content after initial render — place them in reserved space or use overlays |
| Content-visibility | Apply `content-visibility: auto` with `contain-intrinsic-size` on long, off-screen sections (comment lists, product grids) to skip rendering until scrolled into view |
| Web font stability | Use `font-display: swap` and match fallback font metrics with `size-adjust`, `ascent-override`, `descent-override` to minimize text reflow |

---

## Measurement

### Running Lighthouse

**DevTools (recommended — no install required):**
1. Open Chrome DevTools → Lighthouse tab
2. Select categories: Performance, Accessibility, Best Practices, SEO
3. Choose device: Mobile (primary) and Desktop (secondary)
4. Click "Analyze page load"

> **Note:** Lighthouse measures LCP and CLS in lab conditions but **cannot measure real INP** because it does not interact with the page. To verify INP, use Chrome DevTools Performance panel: record a session, click/type through the main flow, and check the "Interactions" track for delays > 200ms. For field data, check PageSpeed Insights (https://pagespeed.web.dev/) which reports real Chrome user data (CrUX) when available.

### Target Scores

| Category | Minimum Score |
|----------|--------------|
| Performance | > 90 |
| Accessibility | > 95 |
| Best Practices | > 95 |
| SEO | > 95 |

### Reading the Report

1. **Performance**: Check LCP and CLS values against targets above. Expand each metric to see the specific element and timing breakdown. For INP, use the Performance panel interaction recording (Lighthouse cannot measure INP).
2. **Opportunities**: Each item shows estimated savings in seconds/KB. Prioritize by impact.
3. **Diagnostics**: Review "Avoid long main-thread tasks" and "Minimize main-thread work" for potential INP issues.
4. **Treemap**: Use the JavaScript treemap (bottom of report) to identify oversized bundles.

### Verifying INP

INP requires real interaction — Lighthouse lab tests cannot measure it.

1. Open Chrome DevTools → Performance tab
2. Click Record, then interact with the page (clicks, taps, keypresses through the main user flow)
3. Stop recording. Look at the "Interactions" track.
4. Any interaction with a delay > 200ms is an INP issue.
5. For field data: check PageSpeed Insights for CrUX data (real Chrome users). Field data is authoritative.
