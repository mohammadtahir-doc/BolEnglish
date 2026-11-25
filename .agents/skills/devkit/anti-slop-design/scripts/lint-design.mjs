#!/usr/bin/env node

/**
 * lint-design.mjs — Deterministic linter for AI-generated design slop & token violations
 *
 * Checks:
 *   1. Literal colors outside :root / @theme (CSS & Tailwind arbitrary bg-[#...], etc.)
 *   2. transition: all or transition-all
 *   3. overflow: hidden or overflow-x: hidden on html/body (must use overflow-x: clip)
 *   4. width: 100vw (causes horizontal scrollbar on desktop)
 *   5. outline removed without :focus-visible
 *   6. animations defined without prefers-reduced-motion media query
 *   7. <div onClick> without button semantics
 *
 * Usage:
 *   node lint-design.mjs [directory] [options]
 *
 * Exit codes:
 *   0 = clean (no design slop findings)
 *   1 = design findings detected
 *   2 = usage error or file reading failure
 */

import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, extname, resolve, relative } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`lint-design.mjs — Deterministic design slop & token linter

Usage:
  node lint-design.mjs [directory] [options]

Options:
  --help, -h    Show this help message and exit

Checks:
  - Literal colors outside :root or @theme (CSS colors, Tailwind arbitrary values)
  - "transition: all" or "transition-all"
  - "overflow: hidden" or "overflow-x: hidden" on html / body
  - "width: 100vw"
  - Outline removed (outline: none/0) without :focus-visible
  - CSS animations without @media (prefers-reduced-motion)
  - <div onClick> without role="button"

Exit codes:
  0: Clean — zero design slop findings
  1: Findings detected
  2: Usage or filesystem error
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
const CSS_EXTS = new Set(['.css', '.scss', '.sass', '.less']);
const MARKUP_EXTS = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte']);

const findings = [];
let findingCounter = 0;

function nextId() {
  findingCounter++;
  return `DSGN-${String(findingCounter).padStart(3, '0')}`;
}

// 1. Lint CSS Files
async function lintCssFile(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  let inRootOrTheme = false;
  let braceDepth = 0;
  let hasKeyframes = false;
  let hasReducedMotion = content.includes('prefers-reduced-motion');

  let currentSelector = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track selector when brace opens or before brace
    if (trimmed.includes('{')) {
      const parts = trimmed.split('{');
      currentSelector = (currentSelector + ' ' + parts[0]).trim();
    } else if (braceDepth === 0 && !trimmed.startsWith('@') && !trimmed.startsWith('/*')) {
      currentSelector = (currentSelector + ' ' + trimmed).trim();
    }

    // Track :root and @theme blocks
    if (/:root|@theme/i.test(currentSelector) || (/:root|@theme/i.test(trimmed) && trimmed.includes('{'))) {
      inRootOrTheme = true;
    }

    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        if (braceDepth === 0) {
          inRootOrTheme = false;
          currentSelector = '';
        }
      }
    }

    // A. Literal colors outside :root/@theme
    if (!inRootOrTheme) {
      // Match #hex (3, 4, 6, 8 digits), rgb(), rgba(), hsl(), hsla()
      const colorMatch = line.match(/(?<![\w-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])|\b(?:rgb|rgba|hsl|hsla)\s*\([^)]+\)/);
      if (colorMatch && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
        findings.push({
          id: nextId(),
          rule: 'LITERAL_COLOR',
          severity: 'high',
          file: relative(targetDir, filePath).replace(/\\/g, '/'),
          line: i + 1,
          quote: colorMatch[0],
          fix: 'Replace literal color with a CSS variable token defined in :root (e.g. var(--color-brand-500)).',
        });
      }
    }

    // B. transition: all
    if (/transition\s*:\s*all\b/i.test(line)) {
      const match = line.match(/transition\s*:\s*all\b/i);
      findings.push({
        id: nextId(),
        rule: 'TRANSITION_ALL',
        severity: 'high',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: match[0],
        fix: 'Never transition "all". Specify explicit properties (e.g. "transition: transform 150ms ease-out, opacity 150ms ease-out").',
      });
    }

    // C. overflow: hidden or overflow-x: hidden on html/body
    const isRootSelector = /(?:^|[,\s>+~])(?:html|body)\b/i.test(currentSelector);
    if ((isRootSelector || /(?:html|body)\b/i.test(line)) && /overflow(?:-x)?\s*:\s*hidden\b/i.test(line)) {
      findings.push({
        id: nextId(),
        rule: 'OVERFLOW_HIDDEN_ROOT',
        severity: 'critical',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: line.trim(),
        fix: 'Never use "overflow: hidden" or "overflow-x: hidden" on html or body. Use "overflow-x: clip" instead.',
      });
    }

    // D. width: 100vw
    if (/width\s*:\s*100vw\b/i.test(line)) {
      findings.push({
        id: nextId(),
        rule: 'WIDTH_100VW',
        severity: 'high',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: 'width: 100vw',
        fix: 'Avoid "width: 100vw" as it causes horizontal scrollbars on desktop with scrollbar gutters. Use "width: 100%" instead.',
      });
    }

    // E. Outline removed without :focus-visible
    if (/outline\s*:\s*(?:none|0)\b/i.test(line) && !line.includes(':focus-visible')) {
      findings.push({
        id: nextId(),
        rule: 'OUTLINE_REMOVED',
        severity: 'high',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: line.trim(),
        fix: 'Never set "outline: none" or "outline: 0" without pairing it with an immediate, visible :focus-visible ring.',
      });
    }

    // Check for animations
    if (/@keyframes\b|animation\s*:\s*[a-zA-Z]/i.test(line)) {
      hasKeyframes = true;
    }
  }

  // F. Animation without prefers-reduced-motion
  if (hasKeyframes && !hasReducedMotion) {
    findings.push({
      id: nextId(),
      rule: 'MISSING_REDUCED_MOTION',
      severity: 'high',
      file: relative(targetDir, filePath).replace(/\\/g, '/'),
      line: 1,
      quote: '@keyframes / animation',
      fix: 'File defines CSS animation or @keyframes without @media (prefers-reduced-motion: reduce) override.',
    });
  }
}

// 2. Lint Markup / Component Files
async function lintMarkupFile(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // A. Tailwind arbitrary colors: bg-[#...], text-[#...], border-[#...]
    const arbitraryColor = line.match(/\b(?:bg|text|border|fill|stroke|ring)-\[#(?:[0-9a-fA-F]{3,8})\]/);
    if (arbitraryColor) {
      findings.push({
        id: nextId(),
        rule: 'LITERAL_COLOR_TAILWIND',
        severity: 'high',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: arbitraryColor[0],
        fix: 'Avoid arbitrary color utilities. Use semantic theme color tokens (e.g. bg-brand-500, text-neutral-900).',
      });
    }

    // B. transition-all class
    if (/\btransition-all\b/.test(line)) {
      findings.push({
        id: nextId(),
        rule: 'TRANSITION_ALL',
        severity: 'high',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: 'transition-all',
        fix: 'Avoid "transition-all". Transition specific properties (e.g. transition-transform transition-opacity).',
      });
    }

    // C. Arbitrary w-[100vw]
    if (/\bw-\[100vw\]\b/.test(line)) {
      findings.push({
        id: nextId(),
        rule: 'WIDTH_100VW',
        severity: 'high',
        file: relative(targetDir, filePath).replace(/\\/g, '/'),
        line: i + 1,
        quote: 'w-[100vw]',
        fix: 'Avoid "w-[100vw]". Use "w-full" or "max-w-full" to avoid horizontal scrollbars.',
      });
    }

    // D. <div onClick> without button role
    if (/<div\b[^>]*\bonClick\b/i.test(line) || /<div\b[^>]*\b@click\b/i.test(line)) {
      const hasRoleButton = /role=["']button["']/i.test(line);
      if (!hasRoleButton) {
        const match = line.match(/<div\b[^>]*\bonClick[^{">]*=\{?[^>]*>?/i) || line.match(/<div\b[^>]*>/i);
        findings.push({
          id: nextId(),
          rule: 'DIV_ONCLICK',
          severity: 'high',
          file: relative(targetDir, filePath).replace(/\\/g, '/'),
          line: i + 1,
          quote: (match ? match[0] : '<div onClick').slice(0, 80),
          fix: 'Replace <div onClick> with a native <button> element, or add role="button" with tabIndex and keyboard handlers.',
        });
      }
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
      if (CSS_EXTS.has(ext)) {
        await lintCssFile(full);
      } else if (MARKUP_EXTS.has(ext)) {
        await lintMarkupFile(full);
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
