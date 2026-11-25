# Design Token Discipline

Load this file when token violations are found during Audit, or during the Build phase in Full mode.

---

## What Must Be Tokenized

Every visual value that repeats must live in a declared CSS custom property. No literal `#hex`, `rgb()`, `hsl()`, font-family name, or pixel spacing value should appear outside the `:root` token block (or its framework equivalent).

| Category | Token Pattern | Example | Rule |
|----------|--------------|---------|------|
| **Neutrals** | `--color-neutral-{step}` | `--color-neutral-50` through `--color-neutral-950` | 11 steps: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950. Light mode body background: 50. Dark mode body background: 900 or 950. |
| **Brand** | `--color-brand-{step}` | `--color-brand-500` | At least 3 steps (light, base, dark). Used for primary buttons, active states, links. |
| **Accent** | `--color-accent-{step}` | `--color-accent-500` | 1 accent color. Used sparingly for secondary actions, highlights. |
| **Semantic** | `--color-{name}` | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` | 4 semantic colors. Each with a background tint variant (`--color-success-bg`). |
| **Typography** | `--font-{role}` | `--font-body`, `--font-heading`, `--font-mono` | Maximum 2 families (3 only if mono is needed). Body ≥ 16px. |
| **Type Scale** | `--text-{size}` | `--text-xs` through `--text-4xl` | Scale: 12, 14, 16, 20, 24, 32, 48. Line-height: 1.5 for body, 1.2 for headings. |
| **Spacing** | `--space-{size}` | `--space-1` through `--space-16` | Based on 4px or 8px unit. Only multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. |
| **Radius** | `--radius-{size}` | `--radius-sm`, `--radius-md`, `--radius-lg` | Maximum 3 values. Apply consistently per nesting level. |
| **Shadow** | `--shadow-{level}` | `--shadow-sm`, `--shadow-lg` | Maximum 2 levels. Subtle for cards, elevated for modals/dropdowns. |
| **Motion** | `--duration-{speed}`, `--ease-{type}` | `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--ease-out` | ease-out for enters, ease-in for exits. Always pair with `prefers-reduced-motion` fallback. |

---

## Token Audit Procedure

Run these grep/search commands during Audit. Each match outside `:root` or token declarations is a finding.

1. **Literal colors**: Search for `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(`, `hsla(` outside `:root {}`, `@theme {}`, or Tailwind config.
2. **Literal fonts**: Search for `font-family:` values that are not `var(--font-*)`.
3. **Literal spacing**: Search for `margin:`, `padding:`, `gap:` values in `px` that are not multiples of your base unit (4 or 8).
4. **Important overrides**: Search for `!important`. Each instance means broken specificity — fix the cascade instead.
5. **Color count**: Count unique color values across all CSS. Total should be under 30 (tokens define the palette, usage references them). The template below uses ~26 — real projects will vary. The goal is a bounded, intentional palette.

---

## Minimum Viable Token Block

Copy this as a starting point. Replace values with the project's actual brand colors and type choices.

```css
:root {
  /* Neutrals */
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-300: #d4d4d4;
  --color-neutral-400: #a3a3a3;
  --color-neutral-500: #737373;
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;
  --color-neutral-950: #0a0a0a;

  /* Brand — chosen for 4.5:1+ contrast with white text */
  --color-brand-400: #60a5fa;
  --color-brand-500: #2563eb;
  --color-brand-600: #1d4ed8;

  /* Accent — 3:1+ contrast on neutral-50 */
  --color-accent-500: #b45309;

  /* Semantic — all pass 4.5:1 contrast on their background tints */
  --color-success: #15803d;
  --color-success-bg: #f0fdf4;
  --color-warning: #a16207;
  --color-warning-bg: #fefce8;
  --color-danger: #b91c1c;
  --color-danger-bg: #fef2f2;
  --color-info: #1d4ed8;
  --color-info-bg: #eff6ff;

  /* Typography */
  --font-body: 'Your Body Font', system-ui, sans-serif;
  --font-heading: 'Your Heading Font', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type Scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.25rem;    /* 20px */
  --text-xl: 1.5rem;     /* 24px */
  --text-2xl: 2rem;      /* 32px */
  --text-4xl: 3rem;      /* 48px */

  /* Spacing (4px base) */
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */

  /* Radius */
  --radius-sm: 0.25rem;  /* 4px */
  --radius-md: 0.5rem;   /* 8px */
  --radius-lg: 1rem;     /* 16px */

  /* Shadow */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-lg: 0 4px 12px -1px rgb(0 0 0 / 0.1);

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-neutral-50: #0a0a0a;
    --color-neutral-100: #171717;
    --color-neutral-200: #262626;
    --color-neutral-300: #404040;
    --color-neutral-400: #525252;
    --color-neutral-500: #737373;
    --color-neutral-600: #a3a3a3;
    --color-neutral-700: #d4d4d4;
    --color-neutral-800: #e5e5e5;
    --color-neutral-900: #f5f5f5;
    --color-neutral-950: #fafafa;

    --color-success-bg: #052e16;
    --color-warning-bg: #422006;
    --color-danger-bg: #450a0a;
    --color-info-bg: #172554;

    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
    --shadow-lg: 0 4px 12px -1px rgb(0 0 0 / 0.4);
  }
}
```

Check text contrast at token declaration time:
- `--color-neutral-950` on `--color-neutral-50` → must exceed 4.5:1 for body text.
- `--color-brand-500` used as button background with white text → must exceed 4.5:1.
- Semantic colors on their `*-bg` variants → must exceed 4.5:1.
- `--color-accent-500` on `--color-neutral-50` → must exceed 3:1 for large text and UI components.
- Use browser DevTools color picker or an online contrast checker (e.g., webaim.org/resources/contrastchecker) to verify.
- **If your project's brand colors fail contrast**, darken them until they pass. The template above is pre-verified.
