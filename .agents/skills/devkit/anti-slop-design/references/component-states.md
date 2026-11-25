# Component and Screen State Checklist

Walk this checklist during the **Audit** phase for every component and screen. Each unchecked item is a finding.

---

## Data States (any component that shows data)

| State | What It Must Show | Acceptable Patterns | Common Mistakes |
|-------|------------------|--------------------|-----------------| 
| **Loading** | A visual indicator that data is being fetched | Skeleton placeholders matching the content shape (preferred). Spinner only for small inline actions (button submit). Content must be visible with JS disabled. | Blank screen. Full-page spinner. No loading state at all. Spinner where a skeleton would prevent layout shift. |
| **Empty** | Explanation of what belongs here + a clear next action | "No items yet. Create your first one." with a button. An illustration is optional, not required. | Empty white space with no explanation. "No data" with no next step. A loading state that never resolves. |
| **Error** | What happened (plain language) + a recovery action | "Could not load your projects. Check your connection and try again." with a Retry button. Identified by text, not just a red border. Use `aria-live="polite"` for screen readers. | Generic "Something went wrong." A red border with no text. Console errors with no user-facing message. |
| **Success** | Confirmation that the action completed | Inline message ("Saved"), toast notification, or redirect with status. Brief — 2-3 seconds for toasts. | No feedback at all. User doesn't know if the action worked. Persistent success messages that never dismiss. |
| **Partial / Stale** | Indicator that data may be outdated | "Last updated 5 min ago" or a subtle stale indicator. Show cached data with a refresh option. | Silently showing old data. No indication of freshness. |

---

## Interactive States (buttons, links, inputs, controls)

| State | What It Must Show | CSS/HTML Requirements |
|-------|------------------|----------------------|
| **Default** | Resting visual appearance | Styled with token values. Clear affordance (looks clickable/interactive). |
| **Hover** | Subtle visual change on mouse over | `transition: background-color var(--duration-fast) var(--ease-out)` or similar. Change within 150ms. Not needed on touch devices. |
| **Focus** | Visible focus ring for keyboard users | `:focus-visible { outline: 2px solid var(--color-brand-500); outline-offset: 2px; }`. Appears instantly (no transition on outline). Never `outline: none` without a visible replacement. |
| **Active / Pressed** | Visual feedback on click/tap | Slight scale down (`transform: scale(0.98)`) or color shift. Confirms the press registered. |
| **Disabled** | Visually distinct, interaction blocked | Reduced opacity (0.5) or greyed out. `cursor: not-allowed`. Use `aria-disabled="true"` or `disabled` attribute. Never just remove the click handler with no visual change. |
| **Loading / Busy** | Action is processing, prevent double-submit | Button shows spinner + "Saving…" text. `aria-busy="true"`. Click handler returns early if already processing. Never allow double-submit on forms. |

---

## Form-Specific States

| State | What It Must Show | HTML/ARIA Requirements |
|-------|------------------|----------------------|
| **Valid** | Optional positive feedback | Green checkmark or border. Only after user has interacted (not on page load). |
| **Invalid** | Error message text below the field | Error text in a `<span>` with `role="alert"` or connected via `aria-describedby`. Set `aria-invalid="true"` on the input. Error message is specific: "Email must include @" not "Invalid input". Red/danger color as a supplement to text, never the only indicator (color-blind users). |
| **Required** | Visual indicator + machine-readable | Asterisk (*) or "(required)" label visible. `aria-required="true"` or `required` attribute on the input. |

---

## Screen-Level States

| State | What It Must Show | Notes |
|-------|------------------|-------|
| **Authenticated** | Content appropriate for the signed-in user | Show user name/avatar, relevant data, sign-out option. |
| **Guest / Unauthenticated** | Public content + clear sign-in path | Don't show empty authenticated UI. Show public value proposition + login/signup CTA. |
| **Permission Denied (403)** | Why access is blocked + what to do | "You don't have access to this page. Contact your admin." Never a blank page or generic error. |
| **Not Found (404)** | The page doesn't exist + navigation help | "This page doesn't exist. Go to the homepage." with a link. Never a browser default error page. |
| **Offline** | Connection status + available actions | Show cached content if available. "You're offline. Some features may be unavailable." Only if the app can meaningfully work offline. |
| **First Visit vs. Returning** | Appropriate onboarding or welcome-back | First visit: brief onboarding or empty-state guidance. Returning: skip onboarding, show recent activity. |

---

## Audit Procedure

For each component on the page:

1. Identify its type: data-showing, interactive, form input, or screen-level.
2. Walk the matching table above.
3. For each missing state: record as a finding with file, line or screen area, and severity:
   - **Floor** (must fix): Missing loading state, missing error state, no focus-visible, double-submit possible.
   - **Reflex** (fix unless stated reason): Missing empty state, missing hover, missing disabled state.
   - **Finish** (craft detail): Missing success confirmation, missing stale indicator, first-visit vs. returning.
