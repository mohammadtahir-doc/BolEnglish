#!/usr/bin/env node

/**
 * check-scope.mjs — Scope lock enforcer for agent modifications
 *
 * Compares git diff and untracked files against allowed_files globs in scope.json.
 * Flags any change to package.json or lockfiles unless allow_dependency_changes is true.
 * Flags any file outside scope.
 *
 * Usage:
 *   node check-scope.mjs <scope.json> [options]
 *
 * Exit codes:
 *   0 = all changes are within allowed scope
 *   1 = scope violations detected
 *   2 = usage error or file reading failure
 */

import { readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const DEPENDENCY_FILES = new Set([
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'bun.lock',
  'requirements.txt',
  'pipfile',
  'pipfile.lock',
  'poetry.lock',
  'gemfile',
  'gemfile.lock',
  'go.mod',
  'go.sum',
  'cargo.toml',
  'cargo.lock',
]);

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`check-scope.mjs — Scope lock enforcer for agent modifications

Usage:
  node check-scope.mjs <scope.json> [options]

Arguments:
  <scope.json>      Path to scope configuration file

Options:
  --cwd <dir>       Repository working directory (default: current directory)
  --against <ref>   Optional git ref or commit to diff against (e.g. HEAD~1, main)
  --help, -h        Show this help message

Scope file format (scope.json):
  {
    "allowed_files": [
      "src/**/*.js",
      "public/*.html",
      "styles.css"
    ],
    "allow_dependency_changes": false
  }

Exit codes:
  0: Clean — all modified and untracked files match allowed_files
  1: Scope violation detected (file outside scope or unauthorized dependency edit)
  2: Error loading configuration or running git
`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 2);
}

let scopePath = null;
let repoDir = resolve('.');
let againstRef = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cwd') {
    repoDir = resolve(args[++i]);
  } else if (args[i] === '--against') {
    againstRef = args[++i];
  } else if (!scopePath) {
    scopePath = resolve(args[i]);
  }
}

if (!scopePath) {
  console.error(JSON.stringify({ error: 'Missing path to scope.json' }));
  process.exit(2);
}

// Zero-dependency glob to regex converter
export function globToRegex(globPattern) {
  const normalized = globPattern.replace(/\\/g, '/').trim();
  let reStr = '^';
  let i = 0;

  while (i < normalized.length) {
    const c = normalized[i];
    if (c === '*' && normalized[i + 1] === '*') {
      if (normalized[i + 2] === '/') {
        // **/ matches zero or more directories
        reStr += '(?:.+/)?';
        i += 3;
      } else {
        // ** matches anything including slashes
        reStr += '.*';
        i += 2;
      }
    } else if (c === '*') {
      // * matches anything except slash
      reStr += '[^/]*';
      i++;
    } else if (c === '?') {
      reStr += '[^/]';
      i++;
    } else if (['.', '+', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\'].includes(c)) {
      reStr += '\\' + c;
      i++;
    } else {
      reStr += c;
      i++;
    }
  }

  reStr += '$';
  return new RegExp(reStr);
}

function matchesAnyGlob(filePath, globList) {
  const normPath = filePath.replace(/\\/g, '/');
  for (const glob of globList) {
    const rx = globToRegex(glob);
    if (rx.test(normPath)) return true;
  }
  return false;
}

export function getChangedFiles(cwd, against = null) {
  const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';
  const changed = new Set();

  function runGit(gitArgs) {
    try {
      const out = execFileSync(gitBin, gitArgs, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      return out.split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean);
    } catch {
      return [];
    }
  }

  if (against) {
    // Diff against specific commit or ref
    const diff = runGit(['diff', '--name-only', against]);
    for (const f of diff) changed.add(f);
  } else {
    // Unstaged changes
    const unstaged = runGit(['diff', '--name-only']);
    for (const f of unstaged) changed.add(f);

    // Staged changes
    const staged = runGit(['diff', '--cached', '--name-only']);
    for (const f of staged) changed.add(f);
  }

  // Untracked files (excluding standard gitignore)
  const untracked = runGit(['ls-files', '--others', '--exclude-standard']);
  for (const f of untracked) changed.add(f);

  return Array.from(changed);
}

async function checkScope() {
  let content;
  try {
    content = await readFile(scopePath, 'utf-8');
  } catch (err) {
    console.error(JSON.stringify({ error: `Could not read scope file: ${scopePath}`, message: err.message }));
    process.exit(2);
  }

  let scope;
  try {
    scope = JSON.parse(content);
  } catch (err) {
    console.error(JSON.stringify({ error: `Invalid JSON in scope file: ${scopePath}`, message: err.message }));
    process.exit(2);
  }

  const allowedFiles = Array.isArray(scope.allowed_files) ? scope.allowed_files : [];
  const allowDependencyChanges = Boolean(scope.allow_dependency_changes);
  const userIgnored = Array.isArray(scope.ignored_files)
    ? scope.ignored_files
    : (Array.isArray(scope.ignore_patterns) ? scope.ignore_patterns : []);

  const DEFAULT_EPHEMERAL_PATTERNS = [
    '**/.pytest_cache/**',
    '**/__pycache__/**',
    '**/*.pyc',
    '**/*.sqlite-journal',
    '**/*.db-journal',
    '**/coverage/**',
    '**/.coverage',
    '**/.turbo/**',
    '**/*.tmp',
  ];
  const allIgnored = [...DEFAULT_EPHEMERAL_PATTERNS, ...userIgnored];

  const changedFiles = getChangedFiles(repoDir, againstRef);

  const violations = [];
  const normScopeRel = scopePath ? resolve(scopePath).replace(/\\/g, '/') : null;
  const normRepo = resolve(repoDir).replace(/\\/g, '/');

  for (const file of changedFiles) {
    const fullFilePath = resolve(repoDir, file).replace(/\\/g, '/');
    const normFile = file.replace(/\\/g, '/');

    // Ignore the scope configuration file itself and .devkit internal metadata
    if (fullFilePath === normScopeRel || normFile === 'scope.json' || normFile.endsWith('/scope.json') || normFile.startsWith('.devkit/')) {
      continue;
    }

    // Ignore ephemeral runtime test artifacts and user-configured ignores
    if (matchesAnyGlob(file, allIgnored)) {
      continue;
    }

    const lowerName = basename(file).toLowerCase();

    // 1. Dependency changes check
    if (DEPENDENCY_FILES.has(lowerName)) {
      if (!allowDependencyChanges) {
        violations.push({
          file,
          type: 'DISALLOWED_DEPENDENCY_CHANGE',
          message: `Change to dependency/lockfile "${file}" is disallowed (allow_dependency_changes is false). Upgrading or installing dependencies requires separate approval.`,
        });
      }
    }

    // 2. Allowed files scope check
    const isAllowed = matchesAnyGlob(file, allowedFiles);
    if (!isAllowed) {
      violations.push({
        file,
        type: 'FILE_OUTSIDE_SCOPE',
        message: `File "${file}" is not covered by any pattern in allowed_files: [${allowedFiles.join(', ')}]`,
      });
    }
  }

  if (violations.length > 0) {
    console.error(JSON.stringify({
      valid: false,
      changed_files_count: changedFiles.length,
      violation_count: violations.length,
      violations,
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    valid: true,
    changed_files_count: changedFiles.length,
    changed_files: changedFiles,
    message: 'All changes are within allowed scope.',
  }, null, 2));
  process.exit(0);
}

checkScope();
