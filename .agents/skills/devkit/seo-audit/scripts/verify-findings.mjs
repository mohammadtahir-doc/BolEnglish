#!/usr/bin/env node

/**
 * verify-findings.mjs — Deterministic validator for audit findings
 *
 * Checks that every finding in findings.json has:
 *   - id: string or number
 *   - severity: critical | high | medium | low | info
 *   - file: valid path to existing file
 *   - line: 1-based line number in range
 *   - quote: exact text appearing on that line (whitespace-normalized)
 *   - fix: non-empty fix description
 *
 * Usage:
 *   node verify-findings.mjs <findings.json> [options]
 *
 * Exit codes:
 *   0 = all findings verified successfully
 *   1 = one or more verification failures
 *   2 = usage error or file reading failure
 */

import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info']);

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`verify-findings.mjs — Audit findings validator

Usage:
  node verify-findings.mjs <findings.json> [options]

Arguments:
  <findings.json>   Path to JSON file containing array of findings (or object with .findings)

Options:
  --base <dir>      Base directory to resolve relative file paths (default: current directory)
  --help, -h        Show this help message

Required finding fields:
  - id: non-empty string or number (e.g. "SEC-001")
  - severity: "critical" | "high" | "medium" | "low" | "info"
  - file: path to file that exists on disk
  - line: 1-based integer within file line range
  - quote: substring that exists on the specified line (whitespace-normalized)
  - fix: non-empty string describing the remedy

Exit codes:
  0: All findings verified
  1: Verification failures detected
  2: Error loading or parsing findings file
`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 2);
}

let findingsPath = null;
let baseDir = resolve('.');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base') {
    baseDir = resolve(args[++i]);
  } else if (!findingsPath) {
    findingsPath = resolve(args[i]);
  }
}

if (!findingsPath) {
  console.error(JSON.stringify({ error: 'Missing path to findings.json' }));
  process.exit(2);
}

function normalizeWhitespace(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
}

async function verifyAll() {
  let content;
  try {
    content = await readFile(findingsPath, 'utf-8');
  } catch (err) {
    console.error(JSON.stringify({ error: `Could not read findings file: ${findingsPath}`, message: err.message }));
    process.exit(2);
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    console.error(JSON.stringify({ error: `Invalid JSON in findings file: ${findingsPath}`, message: err.message }));
    process.exit(2);
  }

  const findings = Array.isArray(data) ? data : data.findings;
  if (!Array.isArray(findings)) {
    console.error(JSON.stringify({ error: 'Expected findings to be a JSON array or an object with a "findings" array.' }));
    process.exit(2);
  }

  const failures = [];
  const fileCache = new Map();

  for (let idx = 0; idx < findings.length; idx++) {
    const f = findings[idx];
    const indexStr = `finding[${idx}]`;

    // 1. Check id
    if (f.id === undefined || f.id === null || String(f.id).trim() === '') {
      failures.push({ index: idx, id: f.id ?? null, error: `${indexStr}: Missing or empty "id"` });
    }

    // 2. Check severity
    const sev = typeof f.severity === 'string' ? f.severity.toLowerCase() : '';
    if (!VALID_SEVERITIES.has(sev)) {
      failures.push({
        index: idx,
        id: f.id ?? null,
        error: `${indexStr}: Invalid severity "${f.severity}". Must be one of: critical, high, medium, low, info`,
      });
    }

    // 3. Check fix
    if (!f.fix || typeof f.fix !== 'string' || f.fix.trim().length === 0) {
      failures.push({ index: idx, id: f.id ?? null, error: `${indexStr}: Missing or empty "fix" field` });
    }

    // 4. Check file and line
    if (!f.file || typeof f.file !== 'string') {
      failures.push({ index: idx, id: f.id ?? null, error: `${indexStr}: Missing or invalid "file" path` });
      continue;
    }

    const targetFile = resolve(baseDir, f.file);
    let lines = fileCache.get(targetFile);

    if (!lines) {
      try {
        const fileContent = await readFile(targetFile, 'utf-8');
        lines = fileContent.split('\n');
        fileCache.set(targetFile, lines);
      } catch (err) {
        failures.push({
          index: idx,
          id: f.id ?? null,
          file: f.file,
          error: `${indexStr}: File does not exist or cannot be read: ${f.file}`,
        });
        continue;
      }
    }

    const lineNum = Number(f.line);
    if (!Number.isInteger(lineNum) || lineNum < 1 || lineNum > lines.length) {
      failures.push({
        index: idx,
        id: f.id ?? null,
        file: f.file,
        line: f.line,
        error: `${indexStr}: Line ${f.line} out of range (1..${lines.length}) for file ${f.file}`,
      });
      continue;
    }

    // 5. Check quote
    if (f.quote === undefined || f.quote === null || String(f.quote).trim() === '') {
      failures.push({ index: idx, id: f.id ?? null, file: f.file, line: f.line, error: `${indexStr}: Missing or empty "quote"` });
      continue;
    }

    const actualLine = lines[lineNum - 1];
    const normQuote = normalizeWhitespace(String(f.quote));
    const normActual = normalizeWhitespace(actualLine);

    if (normActual.includes(normQuote)) {
      // Direct exact match on specified line
      continue;
    }

    // Check if within tolerance window (+/- 3 lines due to minor comment/import shifts)
    let matchedToleranceLine = null;
    const tolerance = 3;
    const minLine = Math.max(1, lineNum - tolerance);
    const maxLine = Math.min(lines.length, lineNum + tolerance);

    for (let l = minLine; l <= maxLine; l++) {
      if (l === lineNum) continue;
      if (normalizeWhitespace(lines[l - 1]).includes(normQuote)) {
        matchedToleranceLine = l;
        break;
      }
    }

    if (matchedToleranceLine) {
      // Close match within tolerance window: accept with drift note
      f.verified_line = matchedToleranceLine;
      f.line_drift = matchedToleranceLine - lineNum;
      continue;
    }

    // If not in tolerance window, find if it exists anywhere else in file to give a precise suggestion
    let suggestedLine = null;
    for (let l = 1; l <= lines.length; l++) {
      if (normalizeWhitespace(lines[l - 1]).includes(normQuote)) {
        suggestedLine = l;
        break;
      }
    }

    failures.push({
      index: idx,
      id: f.id ?? null,
      file: f.file,
      line: lineNum,
      error: suggestedLine
        ? `${indexStr}: Quote mismatch on line ${lineNum} of ${f.file} (found on line ${suggestedLine})`
        : `${indexStr}: Quote mismatch on line ${lineNum} of ${f.file} (quote not found anywhere in file)`,
      expected_quote: normQuote,
      actual_line: normActual,
      ...(suggestedLine ? { suggested_line: suggestedLine } : { hallucination_flag: true }),
    });
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({
      verified: false,
      total_findings: findings.length,
      failure_count: failures.length,
      failures,
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    verified: true,
    total_findings: findings.length,
    message: `All ${findings.length} findings verified successfully.`,
  }, null, 2));
  process.exit(0);
}

verifyAll();
