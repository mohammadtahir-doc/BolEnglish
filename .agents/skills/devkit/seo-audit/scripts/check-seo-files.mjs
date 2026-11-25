#!/usr/bin/env node

/**
 * check-seo-files.mjs — Deterministic SEO & crawlability validator
 *
 * Checks:
 *   1. robots.txt present and contains a Sitemap: directive
 *   2. sitemap.xml present with valid absolute URLs on a single host, and NO URL fragments (#)
 *   3. Canonical link (<link rel="canonical" href="...">) present on HTML pages
 *   4. Open Graph meta tags (og:title, og:description) present
 *   5. JSON-LD structured data parses and contains valid @context, @type, and required properties
 *   6. Detects client-only SPA rendering (empty root div with no pre-rendered text)
 *
 * Usage:
 *   node check-seo-files.mjs [directory] [options]
 *
 * Exit codes:
 *   0 = clean (no SEO foundation issues)
 *   1 = findings detected
 *   2 = usage error or filesystem error
 */

import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, extname, resolve, relative } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`check-seo-files.mjs — Deterministic SEO validator

Usage:
  node check-seo-files.mjs [directory] [options]

Options:
  --help, -h    Show this help message and exit

Checks:
  - robots.txt exists and contains Sitemap: line
  - sitemap.xml exists, URLs are absolute, single host, and contain no fragments (#)
  - <link rel="canonical"> present on HTML pages
  - Open Graph tags (og:title, og:description) present on HTML pages
  - JSON-LD parses with valid @context, @type, and required properties
  - Client-only rendering detection (empty root container with no pre-rendered markup)

Exit codes:
  0: Clean (all foundational checks pass)
  1: Issues detected
  2: Error
`);
  process.exit(0);
}

const targetDir = resolve(args[0] || '.');

try {
  await access(targetDir);
} catch {
  console.error(JSON.stringify({ error: `Directory does not exist: ${targetDir}` }));
  process.exit(2);
}

const findings = [];
let findingCounter = 0;

function nextId() {
  findingCounter++;
  return `SEO-${String(findingCounter).padStart(3, '0')}`;
}

async function findFileInDirs(filename, dirs) {
  for (const d of dirs) {
    const candidate = join(d, filename);
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

const searchDirs = [targetDir, join(targetDir, 'public'), join(targetDir, 'static'), join(targetDir, 'dist')];

// 1. Check robots.txt
async function checkRobotsTxt() {
  const robotsPath = await findFileInDirs('robots.txt', searchDirs);
  if (!robotsPath) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_ROBOTS_TXT',
      severity: 'high',
      file: 'robots.txt',
      line: 1,
      quote: 'robots.txt',
      fix: 'Create a robots.txt file in the site root with crawl permissions and a Sitemap: directive.',
    });
    return;
  }

  const rel = relative(targetDir, robotsPath).replace(/\\/g, '/');
  let content = '';
  try {
    content = await readFile(robotsPath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  const sitemapLine = lines.find(l => /^sitemap\s*:\s*https?:\/\//i.test(l.trim()));
  if (!sitemapLine) {
    findings.push({
      id: nextId(),
      rule: 'ROBOTS_MISSING_SITEMAP',
      severity: 'high',
      file: rel,
      line: 1,
      quote: lines[0] || 'robots.txt',
      fix: 'Add a "Sitemap: https://yourdomain.com/sitemap.xml" directive to robots.txt.',
    });
  }
}

// 2. Check sitemap.xml
async function checkSitemapXml() {
  const sitemapPath = await findFileInDirs('sitemap.xml', searchDirs);
  if (!sitemapPath) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_SITEMAP_XML',
      severity: 'high',
      file: 'sitemap.xml',
      line: 1,
      quote: 'sitemap.xml',
      fix: 'Create a sitemap.xml listing all public, indexable page URLs with <loc> and <lastmod>.',
    });
    return;
  }

  const rel = relative(targetDir, sitemapPath).replace(/\\/g, '/');
  let content = '';
  try {
    content = await readFile(sitemapPath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  const locMatches = Array.from(content.matchAll(/<loc\b[^>]*>(.*?)<\/loc>/gi));

  if (locMatches.length === 0) {
    findings.push({
      id: nextId(),
      rule: 'EMPTY_SITEMAP',
      severity: 'high',
      file: rel,
      line: 1,
      quote: content.slice(0, 80),
      fix: 'sitemap.xml contains no <loc> URLs.',
    });
    return;
  }

  let baseHost = null;

  for (const match of locMatches) {
    const rawUrl = match[1].trim();
    const lineNum = lines.findIndex(l => l.includes(match[0])) + 1;

    // A. Check for URL fragments (#)
    if (rawUrl.includes('#')) {
      findings.push({
        id: nextId(),
        rule: 'SITEMAP_URL_FRAGMENT',
        severity: 'critical',
        file: rel,
        line: lineNum > 0 ? lineNum : 1,
        quote: match[0],
        fix: `Sitemap URL contains a fragment (#): "${rawUrl}". Search engines index documents, not fragments. Remove the fragment.`,
      });
    }

    // B. Check URL validity and single host
    try {
      const parsed = new URL(rawUrl);
      if (!parsed.protocol.startsWith('http')) {
        findings.push({
          id: nextId(),
          rule: 'SITEMAP_NON_HTTP_URL',
          severity: 'high',
          file: rel,
          line: lineNum > 0 ? lineNum : 1,
          quote: match[0],
          fix: `Sitemap URL "${rawUrl}" must use http: or https: scheme.`,
        });
      }

      if (!baseHost) {
        baseHost = parsed.host;
      } else if (parsed.host !== baseHost) {
        findings.push({
          id: nextId(),
          rule: 'SITEMAP_MULTIPLE_HOSTS',
          severity: 'medium',
          file: rel,
          line: lineNum > 0 ? lineNum : 1,
          quote: match[0],
          fix: `Sitemap URL has host "${parsed.host}", but earlier URLs use "${baseHost}". Sitemaps should list URLs on a single host.`,
        });
      }
    } catch {
      findings.push({
        id: nextId(),
        rule: 'SITEMAP_INVALID_URL',
        severity: 'critical',
        file: rel,
        line: lineNum > 0 ? lineNum : 1,
        quote: match[0],
        fix: `Sitemap URL is not a valid absolute URL: "${rawUrl}".`,
      });
    }
  }
}

// 3. Check HTML Pages
async function checkHtmlFile(filePath) {
  let content = '';
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  const rel = relative(targetDir, filePath).replace(/\\/g, '/');

  // A. Canonical tag
  const canonicalMatch = content.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                         content.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if (!canonicalMatch) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_CANONICAL',
      severity: 'high',
      file: rel,
      line: 1,
      quote: '<head>',
      fix: 'Add <link rel="canonical" href="https://yourdomain.com/canonical-url"> inside <head>.',
    });
  }

  // B. Open Graph tags
  const ogTitle = content.match(/<meta\b[^>]*property=["']og:title["'][^>]*>/i);
  const ogDesc = content.match(/<meta\b[^>]*property=["']og:description["'][^>]*>/i);
  if (!ogTitle || !ogDesc) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_OG_TAGS',
      severity: 'medium',
      file: rel,
      line: 1,
      quote: '<head>',
      fix: 'Include Open Graph tags (<meta property="og:title"> and <meta property="og:description">) for social & AI citation sharing.',
    });
  }

  // C. JSON-LD validation
  const jsonLdBlocks = Array.from(content.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const block of jsonLdBlocks) {
    const rawJson = block[1].trim();
    const lineNum = lines.findIndex(l => l.includes('<script') && l.includes('application/ld+json')) + 1;

    try {
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item['@context'] || !/schema\.org/i.test(item['@context'])) {
          findings.push({
            id: nextId(),
            rule: 'JSONLD_INVALID_CONTEXT',
            severity: 'high',
            file: rel,
            line: lineNum > 0 ? lineNum : 1,
            quote: rawJson.slice(0, 80),
            fix: 'JSON-LD "@context" must be "https://schema.org".',
          });
        }

        if (!item['@type']) {
          findings.push({
            id: nextId(),
            rule: 'JSONLD_MISSING_TYPE',
            severity: 'high',
            file: rel,
            line: lineNum > 0 ? lineNum : 1,
            quote: rawJson.slice(0, 80),
            fix: 'JSON-LD object missing required "@type" declaration.',
          });
        }

        // Check required fields for common types
        const typeStr = item['@type'];
        if (['Article', 'BlogPosting'].includes(typeStr)) {
          if (!item.headline || !item.author) {
            findings.push({
              id: nextId(),
              rule: 'JSONLD_MISSING_REQUIRED_PROP',
              severity: 'medium',
              file: rel,
              line: lineNum > 0 ? lineNum : 1,
              quote: rawJson.slice(0, 80),
              fix: `Schema @type "${typeStr}" requires "headline" and "author".`,
            });
          }
        } else if (typeStr === 'Organization') {
          if (!item.name || !item.url) {
            findings.push({
              id: nextId(),
              rule: 'JSONLD_MISSING_REQUIRED_PROP',
              severity: 'medium',
              file: rel,
              line: lineNum > 0 ? lineNum : 1,
              quote: rawJson.slice(0, 80),
              fix: 'Schema @type "Organization" requires "name" and "url".',
            });
          }
        }
      }
    } catch (err) {
      findings.push({
        id: nextId(),
        rule: 'JSONLD_PARSE_ERROR',
        severity: 'critical',
        file: rel,
        line: lineNum > 0 ? lineNum : 1,
        quote: rawJson.slice(0, 80),
        fix: `Invalid JSON inside <script type="application/ld+json">: ${err.message}`,
      });
    }
  }

  // D. Detect Client-Only Rendering (empty SPA container with no static body text)
  const rootDivMatch = content.match(/<div\b[^>]*(?:id=["'](?:root|app|__next)["']|class=["'][^"']*(?:app-root|app-container)[^"']*)[^>]*>\s*<\/div>/i);
  if (rootDivMatch) {
    // Strip script tags and styles to evaluate remaining visible body text
    const bodyContentMatch = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyContentMatch ? bodyContentMatch[1] : content;
    const stripped = bodyContent
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // If visible text is virtually empty (< 40 characters) while root container is present
    if (stripped.length < 40) {
      const lineNum = lines.findIndex(l => l.includes(rootDivMatch[0])) + 1;
      findings.push({
        id: nextId(),
        rule: 'CLIENT_ONLY_RENDERING',
        severity: 'critical',
        file: rel,
        line: lineNum > 0 ? lineNum : 1,
        quote: rootDivMatch[0],
        fix: 'Client-only SPA detected with empty root container and no pre-rendered content. Use SSG, SSR, or static prerendering so crawlers and AI assistants can extract content.',
      });
    }
  }
}

let htmlFileCount = 0;

async function scanHtmlFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next', '.devkit', 'evals'].includes(entry.name)) {
        await scanHtmlFiles(full);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (['.html', '.htm'].includes(ext)) {
        htmlFileCount++;
        await checkHtmlFile(full);
      }
    }
  }
}

await scanHtmlFiles(targetDir);

// Only check robots.txt and sitemap.xml if the target is a web application with HTML markup or has search assets
const hasWebAssets = htmlFileCount > 0 || (await findFileInDirs('robots.txt', searchDirs)) || (await findFileInDirs('sitemap.xml', searchDirs));
if (hasWebAssets) {
  await checkRobotsTxt();
  await checkSitemapXml();
}

const output = {
  scanned_dir: targetDir,
  total_findings: findings.length,
  findings,
};

console.log(JSON.stringify(output, null, 2));
process.exit(findings.length > 0 ? 1 : 0);
