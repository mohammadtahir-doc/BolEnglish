#!/usr/bin/env node

/**
 * check-headers.mjs — Zero-dependency security headers checker
 *
 * Checks a URL for required security headers and reports their status.
 *
 * Usage:  node check-headers.mjs <url>
 * Output: JSON object with each header's status to stdout.
 *         Exit 0 = all pass, 1 = any fail/missing, 2 = error.
 *
 * Requires Node.js 18+ (native fetch).
 */

const url = process.argv[2];

if (!url) {
  console.error('Usage: node check-headers.mjs <url>');
  process.exit(2);
}

// Require a scheme
if (!/^https?:\/\//i.test(url)) {
  console.error(JSON.stringify({ error: `URL must start with http:// or https://. Got: ${url}` }));
  process.exit(2);
}

const TIMEOUT_MS = 10_000;
const UNSAFE_REFERRER_POLICIES = new Set(['unsafe-url', 'no-referrer-when-downgrade']);

const CHECKS = [
  {
    header: 'strict-transport-security',
    name: 'HSTS',
    test: (value) => {
      if (!value) return { status: 'missing', detail: 'Header not present' };
      const maxAge = value.match(/max-age=(\d+)/i);
      if (!maxAge) return { status: 'fail', detail: 'No max-age directive', value };
      if (parseInt(maxAge[1], 10) < 31536000) return { status: 'fail', detail: `max-age=${maxAge[1]} is less than 31536000 (1 year)`, value };
      return { status: 'pass', value };
    },
  },
  {
    header: 'content-security-policy',
    name: 'CSP',
    test: (value) => {
      if (!value) return { status: 'missing', detail: "Header not present. Set at minimum: default-src 'self'" };
      // Flag wildcard default-src
      if (/default-src\s[^;]*\*/.test(value))
        return { status: 'fail', detail: 'default-src allows wildcard (*) — this is effectively no CSP', value };
      // Flag unsafe-eval
      if (value.includes('unsafe-eval'))
        return { status: 'fail', detail: "Contains 'unsafe-eval' which allows arbitrary script execution", value };
      // Flag unsafe-inline without nonce or strict-dynamic
      if (value.includes('unsafe-inline') && !value.includes('nonce-') && !value.includes('strict-dynamic'))
        return { status: 'warn', detail: "Contains 'unsafe-inline' without nonce or strict-dynamic", value };
      return { status: 'pass', value };
    },
  },
  {
    header: 'x-content-type-options',
    name: 'X-Content-Type-Options',
    test: (value) => {
      if (!value) return { status: 'missing', detail: 'Header not present. Set to: nosniff' };
      if (value.toLowerCase() !== 'nosniff') return { status: 'fail', detail: `Expected "nosniff", got "${value}"`, value };
      return { status: 'pass', value };
    },
  },
  {
    header: 'referrer-policy',
    name: 'Referrer-Policy',
    test: (value) => {
      if (!value) return { status: 'missing', detail: 'Header not present. Recommended: strict-origin-when-cross-origin' };
      // Check for unsafe policies
      const policies = value.split(',').map(p => p.trim().toLowerCase());
      const lastPolicy = policies[policies.length - 1]; // browser uses the last valid one
      if (UNSAFE_REFERRER_POLICIES.has(lastPolicy))
        return { status: 'fail', detail: `"${lastPolicy}" leaks full URLs to other origins. Use strict-origin-when-cross-origin or stricter.`, value };
      return { status: 'pass', value };
    },
  },
  {
    header: 'permissions-policy',
    name: 'Permissions-Policy',
    test: (value) => {
      if (!value) return { status: 'missing', detail: 'Header not present. Restrict unused features: camera=(), microphone=(), geolocation=()' };
      return { status: 'pass', value };
    },
  },
  {
    header: 'x-frame-options',
    name: 'Frame Protection',
    test: (value, headers) => {
      const csp = headers.get('content-security-policy') || '';
      if (csp.includes('frame-ancestors')) return { status: 'pass', detail: 'Protected via CSP frame-ancestors', value: csp };
      if (!value) return { status: 'missing', detail: 'No X-Frame-Options or CSP frame-ancestors. Set X-Frame-Options: DENY or SAMEORIGIN' };
      const v = value.toUpperCase();
      if (v === 'DENY' || v === 'SAMEORIGIN') return { status: 'pass', value };
      return { status: 'fail', detail: `Unexpected value: ${value}`, value };
    },
  },
];

async function fetchWithFallback(targetUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Try HEAD first
    const headResponse = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });

    // If HEAD returns 405, fall back to GET
    if (headResponse.status === 405) {
      clearTimeout(timeout);
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      try {
        const getResponse = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: controller2.signal,
        });
        return getResponse;
      } finally {
        clearTimeout(timeout2);
      }
    }

    return headResponse;
  } finally {
    clearTimeout(timeout);
  }
}

try {
  const response = await fetchWithFallback(url);
  const results = {};
  let hasFailure = false;

  // Warn on non-2xx status — headers may be incomplete or from an error page
  const statusWarning = response.status < 200 || response.status >= 300
    ? `Warning: server returned ${response.status}. Headers may not reflect the real page.`
    : null;

  for (const check of CHECKS) {
    const value = response.headers.get(check.header);
    const result = check.test(value, response.headers);
    results[check.name] = result;
    if (result.status !== 'pass') hasFailure = true;
  }

  results._meta = {
    url,
    status: response.status,
    redirected: response.redirected,
    checked_at: new Date().toISOString(),
    ...(statusWarning && { warning: statusWarning }),
  };

  console.log(JSON.stringify(results, null, 2));
  process.exit(hasFailure ? 1 : 0);
} catch (err) {
  const message = err.name === 'AbortError'
    ? `Request timed out after ${TIMEOUT_MS / 1000}s`
    : err.message;
  console.error(JSON.stringify({ error: message, url }));
  process.exit(2);
}
