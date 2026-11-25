#!/usr/bin/env node

/**
 * check-secrets.mjs — Zero-dependency secret scanner
 *
 * Scans a directory tree for accidentally committed secrets.
 *
 * Usage:  node check-secrets.mjs [directory] [options]
 * Output: JSON object of findings, warnings, and local_only_notes to stdout.
 * Exit codes:
 *   0 = clean (no actionable findings; info-level public keys are reported but do not fail)
 *   1 = actionable secret findings detected (critical, high, medium, low)
 *   2 = usage error, invalid arguments, or scanned path does not exist
 *
 * Skips: node_modules, .git, __pycache__, binary files, lockfiles, images.
 */

import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, extname, basename, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

// --- CLI Option Handling ---
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`check-secrets.mjs — Zero-dependency secret scanner

Usage:
  node check-secrets.mjs [directory] [options]

Options:
  --help, -h    Show this help message and exit

Output (stdout):
  JSON object with the following fields:
    - findings: Array of detected secret findings.
        Each finding contains:
          - file: string (relative or absolute file path)
          - line: number (1-based line number, or 0 for whole-file findings)
          - pattern: string (name of the matched secret pattern)
          - severity: "critical" | "high" | "medium" | "low" | "info"
          - snippet: string (redacted excerpt of the matched secret)
          - note?: string (explanatory context, e.g. for public-by-design keys)
    - warnings: Array of scan warnings (e.g. skipped files exceeding size limit)
    - local_only_notes: Array of git-ignored local sensitive files (never printed in full)
    - scanned_root: string (absolute path of the scanned directory root)

Exit Codes:
  0: Clean (no findings with severity > info)
  1: Actionable secrets detected (findings with severity critical/high/medium/low)
  2: Error (path does not exist, not a directory, or invalid arguments)
`);
  process.exit(0);
}

const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', '.nuxt', 'evals', '.devkit']);
const SKIP_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.mp3', '.zip', '.tar', '.gz', '.lock', '.lockb']);
const MAX_FILE_SIZE = 512 * 1024; // 512 KB

const SENSITIVE_FILES = ['.env', '.env.local', '.env.production', '.env.staging', '.env.development'];

const COMMENT_PLACEHOLDER_RE = /example|placeholder|your[_-]?key|change[_-]?me|xxx|todo|sample|dummy|test_key/i;
const EXACT_PLACEHOLDER_RE = /^(?:your[_-]?(?:api[_-]?)?key(?:[_-]?here)?|change[_-]?me|xxx+|placeholder|todo|sample[_-]?key)$/i;

function redact(value) {
  if (!value || typeof value !== 'string') return '***';
  if (value.length <= 8) return '***';
  return value.slice(0, 3) + '…' + value.slice(-2);
}

function decodeJwtPayload(jwtString) {
  try {
    const parts = jwtString.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function findGitRoot(startDir) {
  try {
    const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';
    const out = execFileSync(gitBin, ['rev-parse', '--show-toplevel'], {
      cwd: startDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim();
  } catch {
    return null;
  }
}

function isGitIgnored(filePath, gitRoot) {
  if (!gitRoot) return false;
  try {
    const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';
    const rel = relative(gitRoot, filePath);
    execFileSync(gitBin, ['check-ignore', '-q', rel], {
      cwd: gitRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

const PATTERNS = [
  // AWS Access Key
  {
    name: 'AWS Access Key',
    severity: 'high',
    regex: /(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])/g,
  },
  // AWS Secret Key
  {
    name: 'AWS Secret Key',
    severity: 'critical',
    regex: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
  },
  // Anthropic API Key
  {
    name: 'Anthropic API Key',
    severity: 'critical',
    regex: /(?<![\w-])sk-ant-(?:api\d{2}-)?[a-zA-Z0-9_-]{32,}(?![\w-])/g,
  },
  // OpenAI API Key (standard 32+ alphanumeric, or sk-proj- 40+)
  {
    name: 'OpenAI API Key',
    severity: 'critical',
    regex: /(?<![\w-])sk-(?:proj-[a-zA-Z0-9_-]{40,}|[a-zA-Z0-9]{32,})(?![\w-])/g,
  },
  // Stripe Secret Key
  {
    name: 'Stripe Secret Key',
    severity: 'critical',
    regex: /(?<![\w-])sk_live_[a-zA-Z0-9]{24,}(?![\w-])/g,
  },
  // Stripe Publishable Key (Public-by-design)
  {
    name: 'Stripe Publishable Key',
    severity: 'info',
    note: 'Public-by-design Stripe publishable key for client-side checkout.',
    regex: /(?<![\w-])pk_(?:live|test)_[a-zA-Z0-9]{24,}(?![\w-])/g,
  },
  // Google / Firebase API Key
  {
    name: 'Google / Firebase Key',
    customCheck: (match, line) => {
      const isFirebase = /firebase|firebaseConfig|appId|authDomain|storageBucket|messagingSenderId/i.test(line);
      if (isFirebase) {
        return {
          pattern: 'Firebase Web API Key',
          severity: 'info',
          note: 'Public-by-design Firebase client API key. Ensure backend resources are secured via Firebase Security Rules.',
        };
      }
      return {
        pattern: 'Google API Key',
        severity: 'high',
      };
    },
    regex: /(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}(?![A-Za-z0-9_-])/g,
  },
  // GitHub Personal Access Token (classic)
  {
    name: 'GitHub PAT (classic)',
    severity: 'critical',
    regex: /(?<![\w-])ghp_[a-zA-Z0-9]{36}(?![\w-])/g,
  },
  // GitHub Personal Access Token (fine-grained)
  {
    name: 'GitHub PAT (fine-grained)',
    severity: 'critical',
    regex: /(?<![\w-])github_pat_[a-zA-Z0-9_]{22,}(?![\w-])/g,
  },
  // GitHub OAuth Token
  {
    name: 'GitHub OAuth Token',
    severity: 'critical',
    regex: /(?<![\w-])gho_[a-zA-Z0-9]{36}(?![\w-])/g,
  },
  // Slack Tokens
  {
    name: 'Slack Bot Token',
    severity: 'high',
    regex: /(?<![\w-])xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}(?![\w-])/g,
  },
  {
    name: 'Slack User Token',
    severity: 'high',
    regex: /(?<![\w-])xoxp-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}(?![\w-])/g,
  },
  // SendGrid API Key
  {
    name: 'SendGrid API Key',
    severity: 'critical',
    regex: /(?<![\w-])SG\.[a-zA-Z0-9_-]{22,}\.[a-zA-Z0-9_-]{22,}(?![\w-])/g,
  },
  // Private Key Block
  {
    name: 'Private Key Block',
    severity: 'critical',
    regex: /-----BEGIN\s+(RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  // Database / service connection string with credentials
  {
    name: 'Connection String',
    severity: 'critical',
    regex: /(?:mongodb|postgres|postgresql|mysql|redis):\/\/[a-zA-Z0-9_%-]+:[^@\s'"]+@[^\s'"]{4,}/gi,
  },
  // Framework secret key assignments (Django, Flask, Rails)
  {
    name: 'Secret Key Assign',
    severity: 'critical',
    regex: /(?:SECRET_KEY|DJANGO_SECRET_KEY|FLASK_SECRET_KEY|Rails\.application\.credentials)\s*[=:]\s*['"]([^'"]{8,})['"]/gi,
  },
  // Hardcoded environment variable fallbacks (process.env.KEY || "secret")
  {
    name: 'Hardcoded Fallback Secret',
    severity: 'high',
    regex: /(?:process\.env\.[a-zA-Z0-9_]+|os\.environ\[[^\]]+\]|getenv\([^)]+\))\s*\|\|\s*['"]([^'"]{8,})['"]/gi,
    isFallback: true,
    isGeneric: true,
  },
  // JSON Secret Field: "password": "...", "api_key": "..."
  {
    name: 'JSON Secret Field',
    severity: 'high',
    regex: /["'](?:api_key|apiKey|api_secret|apiSecret|password|secret_key|secretKey|auth_token|authToken|access_token|accessToken|private_key|privateKey)["']\s*:\s*["']([^'"]{8,})["']/gi,
    isGeneric: true,
  },
  // Generic Secret Assign: password = "...", secret = "..."
  {
    name: 'Generic Secret Assign',
    severity: 'high',
    regex: /(?:password|secret|token|api_key|apikey|api-key|auth_token)\s*[=:]\s*['"]([^'"]{8,})['"]/gi,
    isGeneric: true,
  },
  // JWT Token (inspect payload for role)
  {
    name: 'JWT Token',
    regex: /(?<![\w.-])eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}(?![\w.-])/g,
    customCheck: (match) => {
      const payload = decodeJwtPayload(match);
      if (payload && (payload.role === 'anon' || (payload.iss === 'supabase' && payload.role === 'anon'))) {
        return {
          pattern: 'Supabase Anon Key (JWT)',
          severity: 'info',
          note: 'Public-by-design Supabase anon key (role: anon). Ensure Row Level Security (RLS) is enabled on all tables.',
        };
      }
      if (payload && payload.role === 'service_role') {
        return {
          pattern: 'Supabase Service Role Key (JWT)',
          severity: 'critical',
          note: 'CRITICAL: Supabase service_role key bypasses Row Level Security. Never expose in client code.',
        };
      }
      return {
        pattern: 'JWT Token',
        severity: 'high',
      };
    },
  },
  // Bearer Token
  {
    name: 'Bearer Token',
    severity: 'high',
    regex: /[Bb]earer\s+([a-zA-Z0-9._\-]{20,})/g,
  },
];

const findings = [];
const warnings = [];
const local_only_notes = [];

async function scanFile(filePath, gitRoot) {
  const name = basename(filePath);

  // Check sensitive files (.env, etc.)
  if (SENSITIVE_FILES.includes(name)) {
    if (isGitIgnored(filePath, gitRoot)) {
      local_only_notes.push({
        file: filePath,
        note: `Git-ignored local file present: ${name} (not committed)`,
      });
      return;
    } else {
      findings.push({
        file: filePath,
        line: 0,
        pattern: 'Sensitive file committed',
        severity: 'critical',
        snippet: `File "${name}" found and not in .gitignore`,
      });
      return;
    }
  }

  const info = await stat(filePath);
  if (info.size > MAX_FILE_SIZE) {
    warnings.push({
      file: filePath,
      reason: `Skipped: ${(info.size / 1024).toFixed(0)} KB exceeds ${MAX_FILE_SIZE / 1024} KB limit`,
    });
    return;
  }

  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return; // binary or unreadable
  }

  // Skip if content looks binary
  if (content.includes('\0')) return;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Skip comment lines that contain placeholder markers
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('<!--');
    if (isComment && COMMENT_PLACEHOLDER_RE.test(line)) {
      continue;
    }

    const matchedRanges = [];

    for (const patternDef of PATTERNS) {
      patternDef.regex.lastIndex = 0;
      let match;
      while ((match = patternDef.regex.exec(line)) !== null) {
        const fullMatch = match[0];
        const matchStart = match.index;
        const matchEnd = match.index + fullMatch.length;
        const secretVal = match[1] || fullMatch;

        // Skip exact placeholder values
        if (EXACT_PLACEHOLDER_RE.test(secretVal)) continue;

        // Skip template strings in Bearer tokens
        if (patternDef.name === 'Bearer Token' && (/\$\{|%s|{{|process\.env/i.test(fullMatch))) {
          continue;
        }

        // Skip common false-positive fallback values
        if (patternDef.isFallback && /^(?:development|test|testing|staging|production|localhost|default|undefined|null|true|false|\d+)$/i.test(secretVal)) {
          continue;
        }

        // Check if this range overlaps with an already matched specific pattern
        const overlaps = matchedRanges.some(r => (matchStart < r.end && matchEnd > r.start));
        if (patternDef.isGeneric && overlaps) {
          continue;
        }

        let patternName = patternDef.name;
        let severity = patternDef.severity || 'high';
        let note = patternDef.note || undefined;

        if (patternDef.customCheck) {
          const custom = patternDef.customCheck(fullMatch, line);
          patternName = custom.pattern;
          severity = custom.severity;
          note = custom.note;
        }

        matchedRanges.push({ start: matchStart, end: matchEnd, severity });

        findings.push({
          file: filePath,
          line: i + 1,
          pattern: patternName,
          severity,
          snippet: redact(secretVal),
          ...(note ? { note } : {}),
        });
      }
    }
  }
}

async function scanDir(dir, gitRoot) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.devkit')) {
        await scanDir(full, gitRoot);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (!SKIP_EXTS.has(ext)) {
        await scanFile(full, gitRoot);
      }
    }
  }
}

// --- Main Execution ---
const target = args[0] || '.';
const resolved = resolve(target);

// Verify target exists
try {
  await access(resolved);
} catch {
  console.error(JSON.stringify({ error: `Path does not exist: ${target}`, resolved }));
  process.exit(2);
}

const targetStat = await stat(resolved);
if (!targetStat.isDirectory()) {
  console.error(JSON.stringify({ error: `Not a directory: ${target}`, resolved }));
  process.exit(2);
}

const gitRoot = findGitRoot(resolved);

await scanDir(resolved, gitRoot);

const output = {
  findings,
  warnings,
  local_only_notes,
  scanned_root: resolved,
};

console.log(JSON.stringify(output, null, 2));

const actionable = findings.filter(f => f.severity !== 'info');
process.exit(actionable.length > 0 ? 1 : 0);
