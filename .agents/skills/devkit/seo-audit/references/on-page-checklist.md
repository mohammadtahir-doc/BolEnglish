# On-Page SEO Checklist — Per Public Page

Audit each public page against this checklist during the **Check** (Quick) or **On-Page** (Full) phase. Record the URL and specific evidence for each item.

| # | Check | Rule | Evidence to Record |
|---|-------|------|-------------------|
| 1 | **Title tag** | `<title>` exists, is unique across the site, 50–60 characters, main topic keyword first. Not truncated in search results. Not "Home" or "Untitled". | Exact title text, character count, duplicate check against other pages. |
| 2 | **Meta description** | `<meta name="description">` exists, is unique, 140–160 characters, written to earn the click (not keyword stuffing). Summarizes what the visitor gets. | Exact description text, character count. |
| 3 | **Single H1** | Exactly one `<h1>` on the page. Contains the page's main topic. Matches the search intent. | H1 text, count of H1 elements. |
| 4 | **Heading hierarchy** | Headings follow a logical order: h1 → h2 → h3. No skipped levels (h1 → h3 with no h2). Headings used for structure, not for styling. | List of heading tags and levels in document order. Flag skipped levels. |
| 5 | **Internal links** | Links to other pages on the site use descriptive anchor text. Not "click here", "read more", "learn more". Anchor text tells the user and search engine what the linked page is about. | List internal links with their anchor text. Flag generic anchors. |
| 6 | **Image alt text** | Every meaningful `<img>` has descriptive `alt` text that explains the image content. Not "image", "photo", "IMG_001". Decorative images use `alt=""`. | List images with their alt text. Flag missing, generic, or overly long alt text. |
| 7 | **Image dimensions** | All `<img>` elements have explicit `width` and `height` attributes to prevent Cumulative Layout Shift. | Check for `width` and `height` attributes on each `<img>`. |
| 8 | **Image file names** | Image files have descriptive names (`product-dashboard.webp`, not `IMG_8734.jpg` or `asset-1.png`). | List image file names. Flag non-descriptive names. |
| 9 | **Open Graph tags** | Present in `<head>`: `og:title`, `og:description`, `og:image` (absolute URL, 1200×630px recommended), `og:url`, `og:type`. | List present OG tags and their values. Flag missing required tags. |
| 10 | **Twitter Card tags** | Present in `<head>`: `twitter:card` (summary_large_image for pages with images), `twitter:title`, `twitter:description`. | List present Twitter tags. Flag if `twitter:card` is missing. |
| 11 | **Language attribute** | `<html lang="en">` (or the correct language code) is set on the root element. | Check `<html>` tag for `lang` attribute. |
| 12 | **Content in source HTML** | The page's main content (headings, body text, product information) is present in the raw HTML source that a crawler receives. Not injected by JavaScript after page load. | View source (Ctrl+U) and search for the H1 text, main paragraph text. If absent, the page is client-rendered and at risk of not being indexed. |
| 13 | **No keyword stuffing** | Content reads naturally. No forced repetition of target keywords. No invisible text, hidden keywords, or text matching the background color. | Read the first two paragraphs. If a phrase appears 3+ times in ways that feel unnatural, flag it. |
| 14 | **Content depth** | Page content is substantive for its intent. Not thin content (< 100 words for a page meant to rank). Not just a title and a form. Provides genuine value. | Word count of main content area. For informational pages: < 300 words is thin. For transactional pages: content is adequate if the user can complete the action. |
| 15 | **Internal linking to related content** | The page links to 2–5 related pages on the same site (topic clusters). Not an isolated page with no connections. | Count of internal links in the main content area. Flag pages with 0 internal links. |
