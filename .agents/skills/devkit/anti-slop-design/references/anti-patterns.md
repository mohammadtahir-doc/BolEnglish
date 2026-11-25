# AI-Generated Design Anti-Patterns

Walk every table during the **Audit** phase. For each pattern found, record: file and line (or screen area), the specific "do instead" action, and severity (Floor = must fix, Reflex = fix unless you have a stated reason, Finish = craft detail, never blocks ship).

---

## Colour and Surfaces

| Pattern to Avoid | What to Do Instead | When It's Acceptable | Severity |
|-----------------|-------------------|---------------------|----------|
| Harsh or decorative gradients, gradient backgrounds | One flat background color from your token set. | A gradient that carries meaning: a data scale, a brand signature, or a deliberate design decision documented in `DESIGN.md`. | Reflex |
| Pure white (`#fff`, `#ffffff`) backgrounds | A slightly tinted neutral (`--color-neutral-50`). | When contrast requirements or brand guidelines specifically call for pure white. State the reason. | Reflex |
| Rainbow coloring, neon accents without purpose | One brand color + one accent from the token set. | Neon only when the brand identity is built around it (gaming, nightlife). Document in `DESIGN.md`. | Reflex |
| Generic pastel palettes, the purple-and-black AI default | A palette derived from a real reference or the brand's meaning. No default AI color schemes. | Never acceptable as a default. | Floor |
| Many color shades and opacities scattered through CSS | A small token set: ~9 neutrals (50–950), brand, accent, semantic (success, warning, danger, info). All in `:root`. | Never. All colors go through tokens. | Floor |
| Excessive drop shadows, liquid-glass/glassmorphism everywhere | Two shadow levels max (`--shadow-sm`, `--shadow-lg`). Glass effect on at most one element that earns it. | Glass on a single hero card when the brand is about transparency/openness. Document the reason. | Reflex |

---

## Typography

| Pattern to Avoid | What to Do Instead | When It's Acceptable | Severity |
|-----------------|-------------------|---------------------|----------|
| Inter, Geist, or Space Grotesk chosen by habit | A typeface chosen to match the brand. These fonts are fine — when chosen deliberately with a stated reason. | When the font is intentionally chosen for the brand and documented. | Reflex |
| Trending display fonts (Instrument Serif, etc.) | A type pairing drawn from your references or brand guidelines. | When the display font is a deliberate brand choice, not a trend follow. | Reflex |
| Excessive italics, negative kerning, mono font overuse | Italics for emphasis only. Mono only for code. Normal kerning. Each treatment has one job. | Mono as the primary face only for developer tools. | Reflex |
| ALL CAPS subtitles, eyebrow labels above every heading, tracked small caps | Sentence case or lowercase. Labels in the body face, one step smaller. An eyebrow only where it adds information the heading doesn't. | A single ALL CAPS label (e.g., a category tag) where information hierarchy demands it. State which one and why. | Reflex |
| Periods at the end of titles and headings | Titles without trailing periods. Apply consistently. | Never in titles. | Reflex |
| Em dashes (—) scattered through copy | Plain punctuation. Rewrite the sentence to not need an em dash. | One em dash per page max, in a deliberate aside. | Finish |

---

## Layout and Components

| Pattern to Avoid | What to Do Instead | When It's Acceptable | Severity |
|-----------------|-------------------|---------------------|----------|
| Three feature cards in a row as the default section | A layout built around the one thing the visitor must understand. Cards only for genuinely parallel items. | When showing 3 actual parallel items (pricing plans, team members, product variants). | Reflex |
| Generic bento grids | A grid shaped by your real content, not a template grid filled with content. | A data dashboard where bento layout serves information density. | Reflex |
| Standard 3-tier pricing section with Good/Better/Best | A price layout that follows your real plans, which may be one plan or two. | When you actually have 3 plans. But style it your way, not the AI default. | Reflex |
| Borders and dividers around everything | Space and alignment to group related items. A border only to separate genuinely distinct regions. | A data table where borders aid readability. | Reflex |
| Tags, pills, and badges on every item | Plain text labels. A status chip only for a real state (active, pending, error). | A content management UI where status indicators are functional. | Reflex |
| Excessive soft corner radii, squircles on everything | One or two radius values from your token set (`--radius-sm`, `--radius-md`). Apply consistently. | Never more than 3 radius values in one project. | Reflex |
| Over-detailed UI mockups and wireframes | Show the one screen or flow that proves the point. | Never. Show the real product, not a mockup of it. | Finish |

---

## Decoration and Motion

| Pattern to Avoid | What to Do Instead | When It's Acceptable | Severity |
|-----------------|-------------------|---------------------|----------|
| Lucide/Heroicons/FontAwesome icon on every list item and heading | Icons only where they speed recognition (navigation, status indicators). One icon set, one stroke weight. | Navigation items and status indicators. Max ~8 icons on a landing page. | Reflex |
| Sparkle (✨) icons, unnecessary emoji as decoration | Remove them. Use real imagery or nothing. | A chat/messaging UI where emoji are content. | Reflex |
| Radial orbs, dot-grid backgrounds, dithering, ASCII art | Real photography, real product screenshots, or clean empty space. | Dot-grid only on a design/creative tool where the grid is the product. | Reflex |
| Terminal-window aesthetics, code breadcrumbs on non-dev pages | Only for developer tools where a terminal IS the product. | Dev tool landing pages, CLI documentation. | Reflex |
| Excessive hover animations, animated arrows, parallax everywhere | Short purposeful motion: 150–250ms, ease-out, `transform` and `opacity` only. One reveal animation per page max. Respect `prefers-reduced-motion`. | An interactive showcase or portfolio where motion IS the content. Document the intent. | Floor |

---

## Content and Trust

| Pattern to Avoid | What to Do Instead | When It's Acceptable | Severity |
|-----------------|-------------------|---------------------|----------|
| Fake testimonials, invented logos, made-up metrics ("10,000+ users") | Real testimonials with real names and permission, or leave the section out. Never invent numbers. | Never. | Floor |
| "It's not X, it's Y" or other formulaic AI copywriting | Say the plain thing once, in specific words about your specific product. | Never. | Reflex |
| Section numbering and checkmark (✓) bullets everywhere | Numbers only for real sequences (steps, rankings). Bullets for unordered lists. No decorative checkmarks. | A how-to guide with actual sequential steps. | Finish |
| Generic mockups, placeholder screenshots | Real product screenshots, real demos, or leave blank with a slot for the user to fill. | A pre-launch page where the product isn't built yet — use a clear placeholder labeled "screenshot goes here". | Reflex |
| Missing loading states, no empty/error states | Skeleton loaders for async content. Empty states with explanation + next action. Error states with plain-language message + recovery. | Never acceptable to omit. Load `references/component-states.md` for the full checklist. | Floor |
