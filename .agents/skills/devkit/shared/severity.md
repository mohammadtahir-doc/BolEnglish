# Severity & Scoring Framework

This reference defines how vulnerabilities and audit findings are classified across devkit skills.

---

## 1. The Core Formula

$$\text{Severity} = \text{Exposure} \times \text{Impact}$$

Every candidate finding must evaluate both dimensions. If either is negligible, the finding is downgraded or marked `info`.

### Exposure Scale (1–5)

Scores must be **whole numbers 1 to 5 only**.

| Level | Definition | Typical Scenarios |
|---|---|---|
| **1** | Local only / Unauthenticated internal | Physical machine access required; process runs in private developer sandbox |
| **2** | Restricted access | Internal network only (VPN), or requires specialized timing/race conditions |
| **3** | Authenticated standard user | Logged-in user exploiting access within their own tenant or privileges |
| **4** | Unauthenticated remote | Any network client that can reach public endpoints can trigger the behavior |
| **5** | Internet-wide / Trivial | Remotely exploitable without credentials, automated scanner payload triggers it |

### Impact Scale (1–5)

Scores must be **whole numbers 1 to 5 only**.

| Level | Definition | Typical Scenarios |
|---|---|---|
| **1** | Negligible | Pure informational disclosure of non-sensitive metadata; minor cosmetic inconsistency |
| **2** | Low | Minor resource disruption; leak of low-sensitivity publicly derivable state |
| **3** | Medium | Cross-user data leak within single tenant; denial of service; unauthorized write to non-critical data |
| **4** | High | Multi-tenant data breach; unauthorized funds transfer; elevation to tenant admin |
| **5** | Critical | Remote code execution (RCE); database takeover; full authentication bypass |

---

## 2. Severity Classification Matrix

| Score ($\text{Exposure} \times \text{Impact}$) | Severity Category | Action Requirement |
|---|---|---|
| **20 – 25** | `critical` | Immediate launch blocker. Must be fixed or formally accepted in writing. |
| **12 – 19** | `high` | Launch blocker. Must be fixed before release. |
| **6 – 11** | `medium` | Important defect. Fix in current cycle or schedule ticket. |
| **2 – 5** | `low` | Minor defect or defense-in-depth improvement. |
| **1** (or public-by-design) | `info` | Informational note, hardening advice, or public key with RLS note. |

---

## 3. The Dev-Only Dependency Rule

> [!IMPORTANT]
> **A vulnerability in a dev-only dependency that does not ship to users is NEVER above Medium.**
>
> If a vulnerable package is located in `devDependencies`, build tools (e.g. Vite, Webpack, ESLint), or test runners (e.g. Vitest, Jest), its exposure in production is 1 (internal/local only). Regardless of upstream CVSS score, it cannot be classified as `critical` or `high` unless the build tool directly compiles the vulnerable code into the client bundle.

---

## 4. Scoring Constraints & Reviewer Protocol

1. **Whole numbers 1–5 only**: Fractions, decimals, and ranges (e.g. 3.5 or 2-4) are prohibited.
2. **Fresh-context reviewers only**: Quantitative scores (1–5) may ONLY be assigned by an independent, fresh-context reviewer or subagent that did not write the code.
3. **Write "unscored" when self-evaluating**: When the authoring agent reports candidate findings during early phases, numerical score fields must state `"unscored"`.
4. **No letter grades**: Never use letter grades (A, B, C, D, F, or A+). Only standard severity categories (`critical`, `high`, `medium`, `low`, `info`) are permitted.
