# Accessibility Reference

Load this file during the **Accessibility Deep-Dive** phase (Full mode) or when accessibility checklist items fail during Scan (Quick mode).

---

## Non-Negotiable Requirements (WCAG 2.2 AA)

> WCAG 2.2 is a W3C Recommendation since October 2023. It supersedes WCAG 2.1 and adds new AA criteria including Focus Not Obscured, Dragging Movements, and Accessible Authentication.

### Color Contrast

| Requirement | Minimum Ratio | Applies To |
|-------------|---------------|------------|
| Body text | 4.5:1 | All text below 24px (or 18.66px bold) |
| Large text | 3:1 | Text at or above 24px (or 18.66px bold) |
| UI components | 3:1 | Borders, icons, focus rings, form control outlines against their background |
| Non-text content | 3:1 | Meaningful graphical elements (chart segments, status icons) |

**How to verify:**
- Chrome DevTools: Inspect element → color picker shows contrast ratio with pass/fail indicator
- axe DevTools browser extension: Run scan → review "Color contrast" violations
- Measure against both light and dark mode backgrounds

### Keyboard Navigation

| Requirement | Implementation |
|-------------|----------------|
| All interactive elements reachable | Tab through the entire page — every button, link, input, select, and custom control must receive focus |
| Logical tab order | Focus moves left-to-right, top-to-bottom matching visual layout. Use DOM order, not `tabindex` values > 0 |
| Visible focus ring | Use `:focus-visible` for keyboard focus styling. Ring must have 3:1 contrast against adjacent colors. Never set `outline: none` without a visible replacement |
| No keyboard traps | Focus must be able to leave every component. Modal dialogs trap focus only while open and return focus to the trigger on close |
| Skip-to-content link | First focusable element is a "Skip to main content" link that jumps to `<main>`. Visible on focus |
| Escape key closes overlays | Modals, dropdowns, and popovers close on Escape and return focus to their trigger element |

### Semantic HTML

| Element | Use For | Never Use For |
|---------|---------|---------------|
| `<button>` | Actions: submit, toggle, open menu, delete | Navigation to another page |
| `<a href="...">` | Navigation to a URL or page section | Actions that do not navigate (use `<button>`) |
| `<nav>` | Primary and secondary navigation regions | Wrapping any list of links |
| `<main>` | Primary page content (one per page) | Sidebars, headers, footers |
| `<header>` | Introductory content, site banner | Generic container |
| `<footer>` | Footer content, copyright, secondary nav | Generic container |
| Headings (`h1`–`h6`) | Content hierarchy in sequential order | Styling text to look big/bold (use CSS) |

### Form Labels

| Requirement | Implementation |
|-------------|----------------|
| Visible label for every input | Use `<label for="input-id">` with matching `id` on the input. Visible labels are preferred over `aria-label` |
| Grouped inputs described | Use `<fieldset>` with `<legend>` for radio groups, checkbox groups, and address field sets |
| `aria-label` for icon-only controls | Buttons with only an icon must have `aria-label="descriptive action"` (e.g. `aria-label="Close dialog"`) |
| Placeholder is not a label | Placeholder text disappears on input and fails contrast — always pair with a visible label |

### Alt Text

| Image Type | Alt Text Rule |
|------------|---------------|
| Informative image | Describe the content and function: "Bar chart showing revenue grew 40% in Q3" |
| Actionable image (link/button) | Describe the action: "Go to home page" |
| Decorative image | Set `alt=""` (empty string) so screen readers skip it |
| Complex image (chart, diagram) | Short `alt` plus `aria-describedby` pointing to a longer text description nearby |
| Text in image | `alt` contains the exact text shown in the image. Prefer real text over text-in-images |
| Never use | "Image of...", "Photo of...", "Icon for..." — these are redundant with screen reader announcements |

### Motion

| Requirement | Implementation |
|-------------|----------------|
| Respect reduced motion | Wrap all CSS animations and transitions in `@media (prefers-reduced-motion: no-preference) { ... }`, or disable them under `prefers-reduced-motion: reduce` |
| No auto-play video | Videos with motion do not play automatically, or provide a visible pause/stop control |
| No flashing content | No content flashes more than 3 times per second |
| JS animations | Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before starting JS-driven animations |

### Touch Targets

| Requirement | Specification |
|-------------|---------------|
| Minimum target size (AA) | 24×24 CSS pixels for all interactive elements. This is the WCAG 2.2 AA minimum (SC 2.5.8 Target Size Minimum). |
| Enhanced target size (AAA) | 44×44 CSS pixels. This is the AAA criterion (SC 2.5.5 Target Size Enhanced). Recommended for primary actions and mobile touch targets. |
| Spacing between targets | At least 8px gap between adjacent touch targets to prevent accidental taps |
| Inline link exception | Text links within paragraphs are exempt from the minimum size but should have adequate padding |

### Focus Not Obscured (WCAG 2.2 AA — SC 2.4.11)

| Requirement | Implementation |
|-------------|----------------|
| Focused element not fully hidden | When an element receives keyboard focus, it must not be entirely hidden by sticky headers, footers, chat widgets, or other fixed-position content. At least part of the focused element must be visible. |
| Sticky header compensation | Use `scroll-padding-top` matching the sticky header height to prevent focused elements from scrolling behind it |

### Dragging Movements (WCAG 2.2 AA — SC 2.5.7)

| Requirement | Implementation |
|-------------|----------------|
| No drag-only operations | Any operation that uses dragging (drag-and-drop, sliders, sortable lists) must also be operable with a single pointer action (click, tap) without dragging. For example: a sortable list should also have up/down buttons or a move-to menu. |
| Slider alternative | Range sliders must also accept direct text input or increment/decrement buttons |

### Accessible Authentication (WCAG 2.2 AA — SC 3.3.8)

| Requirement | Implementation |
|-------------|----------------|
| No cognitive function test | Authentication must not require memorizing passwords, solving puzzles, or recognizing objects unless a mechanism like paste, password manager autofill, or a passkey is available |
| Copy-paste allowed | Never block paste in password or authentication code fields |
| Passkeys/OAuth supported | Provide a non-cognitive authentication path where possible |

### Error Identification

| Requirement | Implementation |
|-------------|----------------|
| Not color alone | Errors indicated by icon + text, not just red border. Users who cannot perceive color must still understand the error |
| `aria-invalid` | Set `aria-invalid="true"` on the input when validation fails |
| `aria-describedby` | Point `aria-describedby` to the error message element's `id` so screen readers announce the error when the input is focused |
| Error summary | For forms with multiple errors, provide an error summary at the top of the form linking to each invalid field |

---

## Testing Procedure

Execute these steps in order during the Accessibility Deep-Dive phase:

### 1. Keyboard-Only Walkthrough

1. Put mouse aside. Use only Tab, Shift+Tab, Enter, Space, Escape, and Arrow keys.
2. Navigate through the main user flow (landing → key action → completion).
3. Record every point where: focus is invisible, focus gets trapped, an action cannot be triggered, or tab order is illogical.
4. Test all modals, dropdowns, and menus for focus trapping and Escape-to-close.

### 2. Lighthouse Accessibility Audit

1. Run Lighthouse with Accessibility category selected.
2. Target score: > 95.
3. Review every flagged item and record it in the checklist.

### 3. axe DevTools Scan

1. Install the axe DevTools browser extension.
2. Run a full-page scan.
3. Review violations grouped by severity (Critical > Serious > Moderate).
4. Record each violation with element selector and rule ID.

### 4. Screen Reader Spot Check

Test the main user flow with one screen reader:
- **Windows**: NVDA (free) with Chrome or Firefox
- **macOS**: VoiceOver (built-in) with Safari
- **Verify**: page title announced, headings navigable, form labels read, button purposes clear, error messages announced
