# SEO Audit: Fix Recipes

Concrete before-and-after patterns for fixing technical crawlability, structured data, and search engine discovery defects.

---

## 1. Client-Rendered SPAs Require SSG/SSR; `<noscript>` is NOT a Fix

Empty client-rendered SPA containers (`<div id="root"></div>`) appear blank to web search crawlers and AI answer engines that do not run a full JavaScript rendering engine. Adding a `<noscript>` tag is ignored by modern crawlers and does not solve indexation.

### ❌ Wrong Example
```html
<!-- Client-rendered SPA: crawlers see an empty root container! -->
<body>
  <div id="root"></div>
  <noscript>Please enable JavaScript to view this application.</noscript>
  <script type="module" src="/src/main.jsx"></script>
</body>
```

### ✅ Right Example
Use Static Site Generation (SSG), pre-rendering, or Server-Side Rendering (SSR) so raw HTML response contains visible content:

```html
<!-- Pre-rendered / SSG HTML output: crawlers see real text and hierarchy immediately -->
<body>
  <div id="root">
    <header><h1>Modern Developer Workspace</h1></header>
    <main>
      <p>Automate workflows, audit dependencies, and enforce web standards across your repositories.</p>
    </main>
  </div>
  <script type="module" src="/src/main.jsx"></script>
</body>
```

### How to Verify
1. View page source (`Ctrl+U` or `curl -s https://site.com`).
2. Verify that main headings, paragraphs, and navigation links appear in the raw HTML string without executing JavaScript.
3. Run `node seo-audit/scripts/check-seo-files.mjs .` — verify `CLIENT_ONLY_RENDERING` rule passes.

---

## 2. Sitemaps Must List Real Canonical URLs, Strictly NO Fragments

XML sitemaps tell crawlers which distinct documents exist on a domain. URL fragments (`#section`) denote in-page scroll positions, not distinct documents. Crawlers strip fragments before indexing.

### ❌ Wrong Example
```xml
<!-- Invalid sitemap: uses in-page hash fragments and relative paths -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/features#billing</loc>
  </url>
  <url>
    <loc>https://example.com/pricing#enterprise</loc>
  </url>
</urlset>
```

### ✅ Right Example
```xml
<!-- Valid sitemap: distinct canonical absolute document URLs on a single host -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/features</loc>
    <lastmod>2026-02-15</lastmod>
  </url>
  <url>
    <loc>https://example.com/pricing</loc>
    <lastmod>2026-02-15</lastmod>
  </url>
</urlset>
```

### How to Verify
1. Run `node seo-audit/scripts/check-seo-files.mjs .`.
2. Confirm zero findings for `SITEMAP_URL_FRAGMENT` and `SITEMAP_MULTIPLE_HOSTS`.

---

## 3. Consult User Before Modifying `robots.txt` AI Crawler Policy

AI crawlers have distinct purposes: some index content for search and real-time citations (e.g. `OAI-SearchBot`, `PerplexityBot`), while others scrape content for model training (`GPTBot`, `ClaudeBot`). Disallowing all bots blindly blocks citations in ChatGPT and Claude.

### ❌ Wrong Example
Agent autonomously edits `robots.txt` without asking, blocking all bots by default:
```text
User-agent: *
Disallow: /
```

### ✅ Right Example
Present options to the user at the approval gate before modifying `robots.txt`:
```text
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: PerplexityBot
Allow: /
```

### How to Verify
1. Confirm the state file records user approval for the specific crawler policies chosen.
2. Run `node seo-audit/scripts/check-seo-files.mjs .` to verify `robots.txt` syntax and Sitemap directive.

---

## 4. Structured Data (JSON-LD) Only for Visually Present Content

Google guidelines strictly forbid marking up content that users cannot see on the page. Fabricating reviews, hidden FAQs, or fake ratings risks manual spam penalties.

### ❌ Wrong Example
```html
<!-- Marking up hidden fake ratings or non-existent reviews -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Cloud Tool",
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5.0", "reviewCount": "1000" }
}
</script>
```

### ✅ Right Example
```html
<!-- Mark up only visible entity information that appears in the page body -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Tools Inc.",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
</script>
```

### How to Verify
1. Run `node seo-audit/scripts/check-seo-files.mjs .` to verify JSON-LD parsing.
2. Cross-reference marked-up fields with visible page copy; every property must be visible on the page.
