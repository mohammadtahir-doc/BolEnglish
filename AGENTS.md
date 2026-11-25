# Always-On Devkit Engineering & Audit Rule

Whenever opening, auditing, building, or modifying files in this web application, automatically apply the installed `devkit` skill suite (`.agents/skills/devkit/SKILL.md` and its 4 sub-skills: `security-audit`, `web-best-practices`, `anti-slop-design`, and `seo-audit`).

## Mandatory Checks on Every Change
1. **Security (`security-audit`)**:
   - Never hardcode secrets, credentials, or sensitive fallback values in source files or `.env.example`.
   - Validate all API request inputs, enforce payload/length limits, and maintain HTTP security headers in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` with `microphone=(self)`).
   - Run `node .agents/skills/devkit/security-audit/scripts/check-secrets.mjs .` before finishing.
2. **Web Best Practices (`web-best-practices`)**:
   - Use semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<section>`), native `<button>`/`<a>` elements, accessible labels on all inputs/icon buttons, explicit `width`/`height` on `<img>`, and one `<h1>` per page.
   - Run `node .agents/skills/devkit/web-best-practices/scripts/check-html.mjs .` before finishing.
3. **Anti-Slop Design & Accessibility (`anti-slop-design`)**:
   - Never use `transition-all` or `transition: all` (transition explicit properties instead).
   - Never use `overflow: hidden` or `overflow-x: hidden` on `html` or `body` (use `overflow-x: clip`), and avoid `width: 100vw` / `w-[100vw]`.
   - Never strip focus outlines without providing a visible `:focus-visible` ring, and keep `@media (prefers-reduced-motion: reduce)` handling active animations.
   - Run `node .agents/skills/devkit/anti-slop-design/scripts/lint-design.mjs .` before finishing.
4. **SEO & Verification (`seo-audit`)**:
   - Maintain valid `robots.txt`, `sitemap.xml`, canonical links, Open Graph tags, and real content without invented metrics or claims.
   - Run `node .agents/skills/devkit/seo-audit/scripts/check-seo-files.mjs .` before finishing.
5. **Project Product Constraints**:
   - Preserve user UI preferences on BolEnglish (no white card/box around the welcome overlay in `src/app/page.tsx`, and concise main heading + short 2-3 word subheadings across dashboard screens).
