# Fresh-Context Design Review Prompt

Use this exact prompt at the **Review** phase. Send it to a fresh session or subagent that has NOT seen the build process. The reviewer looks with fresh eyes.

---

## The Prompt

Copy everything between the fences and send it, replacing `[FILES]` with the actual file paths or URL.

```text
You are an independent design reviewer. You did not build this page. Evaluate it on its own merits — check for specific patterns rather than making assumptions about its origin.

Review [FILES] against these 5 criteria. Do not edit anything.

1. TOKEN DISCIPLINE
   List every literal color (#hex, rgb(), hsl()), font-family, spacing value, or border-radius outside a declared CSS variable or token block. Each is a finding.

2. AI TELLS — check these 5 groups and list which patterns are present:
   a. Colour and surfaces: decorative gradients, pure white bg, neon, too many color shades, excessive shadows/glass
   b. Typography: AI-default fonts (Inter/Geist without stated reason), ALL CAPS labels, eyebrow above every heading, periods in titles, em dashes everywhere
   c. Layout: three-cards-in-a-row, generic bento grid, 3-tier pricing, borders around everything, pills/tags on every item, excessive corner radius
   d. Decoration: icons on every line, sparkle emoji, radial orbs, dot-grids, terminal aesthetics (on non-dev page), excessive animation
   e. Content: fake testimonials/logos/metrics, "It's not X it's Y" copy, checkmark bullets everywhere, generic mockups, missing loading/error states

   For each pattern found: state file and line or screen area.

3. COMPONENT STATES
   For each interactive element: check default, hover, focus-visible, active, disabled.
   For each data-showing component: check loading, empty, error, success.
   List every missing state.

4. ACCESSIBILITY
   - Keyboard-only: tab through the entire main flow. Can you complete it? Is focus visible at every step?
   - Contrast: body text ≥ 4.5:1, large text and UI ≥ 3:1
   - Touch targets: all interactive elements ≥ 24×24 CSS px (WCAG 2.2 AA), ≥ 44×44 for primary actions (AAA)
   - Alt text: every meaningful image has descriptive alt, decorative images have alt=""
   - Labels: every form input has a visible label (not placeholder-only)

5. RESPONSIVE
   Check at 360px, 768px, and 1280px wide. No horizontal scroll at any width. Hero visible without scrolling at 1280×800.

SCORING (at the end):

**Distinctiveness** (1–5): Does this page have a clear visual point of view?
1 = Generic template: multiple recognized AI-default patterns from the list above
2 = Mostly generic: 1–2 patterns, no distinctive choices
3 = Neutral: clean and functional but could be any site
4 = Has character: clear visual decisions that distinguish it
5 = Distinctive: intentional design voice, nothing default

**Clarity** (1–5): Is the one main action obvious?
1 = No clear action or too many competing actions
2 = Action exists but is buried or unclear
3 = Action is visible but doesn't stand out
4 = Action is prominent and clear
5 = Action is unmissable and the page is built around it

Base scores on specific evidence (which patterns, which elements), not gut feeling.

OUTPUT FORMAT:
- Findings table: | Finding | Severity (Floor/Reflex/Finish) | Location | Fix |
- Token violations count
- Missing states count
- Accessibility issues count
- Distinctiveness: X/5 — explanation
- Clarity: X/5 — explanation
- Verdict (one word): rebuild | fix | ship

Verdict meanings:
- rebuild: the page has no direction — start the design phase over
- fix: 1–5 specific issues to address, then ship
- ship: ready to launch
```

---

## After the Review

1. If verdict is **ship**: phase is complete. Update state.
2. If verdict is **fix**: apply each listed fix (one change per fix), then run a single confirming re-review.
3. If verdict is **rebuild**: return to the Direction phase (Full mode) or ask the user for design references (Quick mode).

Maximum review rounds: 2. If the second review still says "rebuild," stop and ask the user for explicit direction.
