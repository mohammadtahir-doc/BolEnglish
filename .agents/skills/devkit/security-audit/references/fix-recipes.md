# Security Audit: Fix Recipes

Concrete before-and-after patterns for fixing common vulnerability and deployment defects.

---

## 1. Security Headers Belong in Hosting Config, NOT in Vite Dev Server

Adding security headers to `vite.config.js` or a local development server only affects localhost during development. It does NOT protect users in production because static assets are served directly by CDNs, Cloudflare, Netlify, or Vercel.

### ❌ Wrong Example
```js
// vite.config.js — DOES NOT APPLY TO PRODUCTION CDN!
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'",
      'X-Frame-Options': 'DENY',
    },
  },
});
```

### ✅ Right Example

#### For Cloudflare Pages or Netlify (`public/_headers`):
```text
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline';
```

#### For Vercel (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### How to Verify
1. Deploy to staging/preview URL.
2. Run `node security-audit/scripts/check-headers.mjs https://staging.yourdomain.com`.
3. Check `curl -I https://staging.yourdomain.com` and verify headers appear on the HTTP response.

---

## 2. Dependency Severity Depends on Whether it Ships to Users

Do not classify vulnerabilities in dev-only tooling (e.g. ESLint, Vite, Vitest) as Critical or High launch blockers. If the vulnerable package does not ship in the client bundle, its production exposure is 1 (internal/local only).

### ❌ Wrong Example
```text
Finding: CVE-2024-XXXX in "esbuild" (dependency of Vite)
Severity: CRITICAL (CVSS 9.8) — LAUNCH BLOCKER! Stop deployment!
Rationale: Scanner reported high CVSS score.
```

### ✅ Right Example
```text
Finding: CVE-2024-XXXX in "esbuild"
Severity: MEDIUM (Exposure: 1 [local dev-tool], Impact: 4 [prototype denial of service], Score: 4)
Context: "esbuild" is a build-time devDependency. It never executes in the production runtime
and is not accessible to external web users.
Action: Schedule routine npm update in the next maintenance sprint; does NOT block launch.
```

### How to Verify
1. Check `package.json`: verify whether package is under `dependencies` or `devDependencies`.
2. Inspect the production build bundle (`dist/` or `.next/`): confirm the module is not bundled into client JS.
3. Refer to `shared/severity.md` Section 3: dev-only vulnerabilities are capped at Medium.

---

## 3. Secret Elimination: Environment Variables Without Literal Fallbacks

Never provide a hardcoded production secret as a fallback to `process.env`. If the environment variable fails to load, the hardcoded secret is used silently and leaks into source control.

### ❌ Wrong Example
```javascript
// Hardcoded fallback secret leaks into source and repository history
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "placeholder";
```

### ✅ Right Example
```javascript
// Strict fail-fast assertion on startup
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}
```

### How to Verify
1. Run `node security-audit/scripts/check-secrets.mjs .`. It must exit with code 0.
2. Start the application without the environment variable: verify it fails immediately with an explicit error rather than falling back to an unauthenticated secret.
