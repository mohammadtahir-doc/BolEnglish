#!/usr/bin/env node

/**
 * check-html.mjs — Deterministic scanner for HTML & component best practices
 *
 * Checks:
 *   1. <title> present and non-empty in HTML documents
 *   2. <meta name="description"> present and length 50–160 characters
 *   3. <meta name="viewport" content="width=device-width, ...">
 *   4. <html lang="..."> attribute set
 *   5. Exactly one <h1> heading per page
 *   6. <img> elements have alt attribute and explicit width/height dimensions
 *   7. Form <input> elements have accessible labels (label with for, wrapping label, or aria-label)
 *   8. Broken anchor links (<a href="#">)
 *
 * Confidence:
 *   - .html documents: "deterministic"
 *   - .jsx / .tsx components: "heuristic" (since props or wrappers may be dynamic)
 *
 * Usage:
 *   node check-html.mjs [directory] [options]
 *
 * Exit codes:
 *   0 = clean (no HTML best practice issues)
 *   1 = findings detected
 *   2 = usage error or filesystem error
 */

import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, extname, resolve, relative } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`check-html.mjs — HTML and component standards scanner

Usage:
  node check-html.mjs [directory] [options]

Options:
  --help, -h    Show this help message and exit

Checks:
  - <title> tag present and non-empty
  - <meta name="description"> length between 50 and 160 characters
  - <meta name="viewport"> with width=device-width
  - <html lang="..."> attribute set
  - Exactly one <h1> element per page
  - <img> has alt attribute and explicit width/height
  - <input> has an associated label or aria-label
  - No empty dummy links (<a href="#">)

Exit codes:
  0: Clean (no issues found)
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

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.devkit', 'evals']);
const HTML_EXTS = new Set(['.html', '.htm']);
const JSX_EXTS = new Set(['.jsx', '.tsx']);

const findings = [];
let findingCounter = 0;

function nextId() {
  findingCounter++;
  return `HTML-${String(findingCounter).padStart(3, '0')}`;
}

async function checkHtmlDoc(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  const relPath = relative(targetDir, filePath).replace(/\\/g, '/');
  const confidence = 'deterministic';

  // 1. Check <html lang="...">
  const htmlTagMatch = content.match(/<html\b[^>]*>/i);
  if (htmlTagMatch) {
    if (!/lang=["'][a-zA-Z0-9_-]+["']/i.test(htmlTagMatch[0])) {
      const lineNum = lines.findIndex(l => l.includes(htmlTagMatch[0])) + 1;
      findings.push({
        id: nextId(),
        rule: 'MISSING_HTML_LANG',
        severity: 'high',
        confidence,
        file: relPath,
        line: lineNum > 0 ? lineNum : 1,
        quote: htmlTagMatch[0],
        fix: 'Add lang attribute to <html> tag (e.g. <html lang="en">).',
      });
    }
  }

  // 2. Check <title>
  const titleMatch = content.match(/<title\b[^>]*>(.*?)<\/title>/is);
  if (!titleMatch || !titleMatch[1].trim()) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_TITLE',
      severity: 'critical',
      confidence,
      file: relPath,
      line: 1,
      quote: titleMatch ? titleMatch[0] : '<head>',
      fix: 'Include a descriptive, non-empty <title> tag inside <head>.',
    });
  }

  // 3. Check viewport meta
  const viewportMatch = content.match(/<meta\b[^>]*name=["']viewport["'][^>]*>/i) ||
                        content.match(/<meta\b[^>]*content=["'][^"']*width=device-width[^"']*["'][^>]*name=["']viewport["'][^>]*>/i);
  if (!viewportMatch || !viewportMatch[0].includes('width=device-width')) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_VIEWPORT_META',
      severity: 'critical',
      confidence,
      file: relPath,
      line: 1,
      quote: viewportMatch ? viewportMatch[0] : '<head>',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head>.',
    });
  }

  // 4. Check meta description
  const metaDescMatch = content.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                        content.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  if (!metaDescMatch) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_META_DESCRIPTION',
      severity: 'high',
      confidence,
      file: relPath,
      line: 1,
      quote: '<head>',
      fix: 'Add a <meta name="description" content="..."> tag with 50–160 characters summarizing the page.',
    });
  } else {
    const descText = metaDescMatch[1].trim();
    if (descText.length < 50 || descText.length > 160) {
      const lineNum = lines.findIndex(l => l.includes(metaDescMatch[0])) + 1;
      findings.push({
        id: nextId(),
        rule: 'META_DESCRIPTION_LENGTH',
        severity: 'medium',
        confidence,
        file: relPath,
        line: lineNum > 0 ? lineNum : 1,
        quote: metaDescMatch[0].slice(0, 80),
        fix: `Meta description length (${descText.length} chars) is outside recommended range (50–160 chars).`,
      });
    }
  }

  // 5. Check <h1> count
  const h1Matches = Array.from(content.matchAll(/<h1\b[^>]*>/gi));
  if (h1Matches.length === 0) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_H1',
      severity: 'high',
      confidence,
      file: relPath,
      line: 1,
      quote: '<body>',
      fix: 'Page must have exactly one <h1> element denoting the primary topic.',
    });
  } else if (h1Matches.length > 1) {
    const secondH1Line = lines.findIndex(l => l.includes(h1Matches[1][0])) + 1;
    findings.push({
      id: nextId(),
      rule: 'MULTIPLE_H1',
      severity: 'high',
      confidence,
      file: relPath,
      line: secondH1Line > 0 ? secondH1Line : 1,
      quote: h1Matches[1][0],
      fix: `Page has ${h1Matches.length} <h1> tags. Use exactly one <h1> for the page title and <h2>–<h6> for subsections.`,
    });
  }

  // Check line-by-line elements: img, input, a href="#"
  await checkElements(lines, relPath, confidence, content);
}

async function checkJsxComponent(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  const relPath = relative(targetDir, filePath).replace(/\\/g, '/');
  const confidence = 'heuristic';

  await checkElements(lines, relPath, confidence, content);
}

async function checkElements(lines, relPath, confidence, fullContent) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 6. <img> checks (alt and dimensions)
    const imgMatches = Array.from(line.matchAll(/<img\b([^>]*)\/?>/gi));
    for (const match of imgMatches) {
      const attrs = match[1];

      // Missing alt
      if (!/\balt\s*=/i.test(attrs)) {
        findings.push({
          id: nextId(),
          rule: 'IMG_MISSING_ALT',
          severity: 'high',
          confidence,
          file: relPath,
          line: i + 1,
          quote: match[0].slice(0, 80),
          fix: 'Every <img> must have an alt attribute (alt="" if decorative, or descriptive text).',
        });
      }

      // Missing explicit width and height
      const hasWidth = /\bwidth\s*=/i.test(attrs) || /style=["'][^"']*width\s*:/i.test(attrs);
      const hasHeight = /\bheight\s*=/i.test(attrs) || /style=["'][^"']*height\s*:/i.test(attrs);
      if (!hasWidth || !hasHeight) {
        findings.push({
          id: nextId(),
          rule: 'IMG_MISSING_DIMENSIONS',
          severity: 'medium',
          confidence,
          file: relPath,
          line: i + 1,
          quote: match[0].slice(0, 80),
          fix: 'Set explicit width and height on <img> (or CSS aspect-ratio) to prevent Cumulative Layout Shift (CLS).',
        });
      }
    }

    // 7. Unlabeled inputs
    const inputMatches = Array.from(line.matchAll(/<input\b([^>]*)\/?>/gi));
    for (const match of inputMatches) {
      const attrs = match[1];
      const typeMatch = attrs.match(/\btype=["']([^"']*)["']/i);
      const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';

      if (['hidden', 'submit', 'button', 'reset'].includes(inputType)) {
        continue;
      }

      const hasAriaLabel = /\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs);
      const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
      let hasMatchingLabel = false;

      if (idMatch) {
        const inputId = idMatch[1];
        const labelRegex = new RegExp(`<label\\b[^>]*for=["']${inputId}["']`, 'i');
        if (labelRegex.test(fullContent)) {
          hasMatchingLabel = true;
        }
      }

      // Check if wrapped in <label>
      const isWrapped = /<label\b[^>]*>[\s\S]*?<input/i.test(line);

      if (!hasAriaLabel && !hasMatchingLabel && !isWrapped) {
        findings.push({
          id: nextId(),
          rule: 'UNLABELED_INPUT',
          severity: 'high',
          confidence,
          file: relPath,
          line: i + 1,
          quote: match[0].slice(0, 80),
          fix: 'Provide a visible <label for="...">, wrap input in <label>, or add aria-label for accessibility.',
        });
      }
    }

    // 8. Broken anchor links (<a href="#">)
    const brokenLinkMatch = line.match(/<a\b[^>]*href=["']#["'][^>]*>/i);
    if (brokenLinkMatch) {
      findings.push({
        id: nextId(),
        rule: 'BROKEN_HASH_LINK',
        severity: 'medium',
        confidence,
        file: relPath,
        line: i + 1,
        quote: brokenLinkMatch[0].slice(0, 80),
        fix: 'Avoid <a href="#">. Use a <button> for clickable actions or provide a meaningful href URL.',
      });
    }
  }
}

async function scan(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await scan(full);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (HTML_EXTS.has(ext)) {
        await checkHtmlDoc(full);
      } else if (JSX_EXTS.has(ext)) {
        await checkJsxComponent(full);
      }
    }
  }
}

await scan(targetDir);

const output = {
  scanned_dir: targetDir,
  total_findings: findings.length,
  findings,
};

console.log(JSON.stringify(output, null, 2));
process.exit(findings.length > 0 ? 1 : 0);
