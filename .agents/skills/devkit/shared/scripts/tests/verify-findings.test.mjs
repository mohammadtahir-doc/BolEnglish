import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, '..', 'verify-findings.mjs');

function runVerifier(findingsPath, extraArgs = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, findingsPath, ...extraArgs], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let data = null;
    try { data = JSON.parse(stdout); } catch {}
    return { exitCode: 0, stdout, stderr: '', data };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    let data = null;
    try { data = JSON.parse(stdout || stderr); } catch {}
    return { exitCode: err.status, stdout, stderr, data };
  }
}

test('CLI --help displays documentation and exits 0', () => {
  const res = runVerifier('--help');
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Required finding fields:/);
});

test('Valid findings pass with exit 0 (including whitespace normalization)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-ok-'));
  try {
    const code = [
      '// Line 1: Header',
      'const   secretKey  =   "unauthorized_key";',
      'function doWork() { return 42; }',
    ].join('\n');
    await writeFile(join(dir, 'target.js'), code);

    const findings = [
      {
        id: 'SEC-001',
        severity: 'high',
        file: 'target.js',
        line: 2,
        quote: 'const secretKey = "unauthorized_key";',
        fix: 'Move secret key to server environment variable',
      },
      {
        id: 'SEC-002',
        severity: 'info',
        file: 'target.js',
        line: 3,
        quote: 'function doWork()',
        fix: 'Annotate return type for documentation',
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.verified, true);
    assert.equal(res.data.total_findings, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Fails with exit 1 when file does not exist', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-nofile-'));
  try {
    const findings = [
      {
        id: 'SEC-001',
        severity: 'critical',
        file: 'nonexistent.js',
        line: 1,
        quote: 'bad_code()',
        fix: 'Fix missing file',
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 1);
    assert.equal(res.data.verified, false);
    assert.match(res.data.failures[0].error, /File does not exist/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Fails with exit 1 when line number is out of range', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-line-range-'));
  try {
    await writeFile(join(dir, 'short.js'), 'const a = 1;\n');
    const findings = [
      {
        id: 'SEC-001',
        severity: 'medium',
        file: 'short.js',
        line: 99,
        quote: 'missing',
        fix: 'Adjust line number',
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 1);
    assert.match(res.data.failures[0].error, /out of range/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Fails with exit 1 when quote does not match line content', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-mismatch-'));
  try {
    await writeFile(join(dir, 'app.js'), 'console.log("hello");\n');
    const findings = [
      {
        id: 'SEC-001',
        severity: 'low',
        file: 'app.js',
        line: 1,
        quote: 'process.exit(1)', // does not exist on line 1
        fix: 'Correct the quote',
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 1);
    assert.match(res.data.failures[0].error, /Quote mismatch/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Fails with exit 1 when severity or fix is invalid', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-invalid-'));
  try {
    await writeFile(join(dir, 'app.js'), 'const x = 10;\n');
    const findings = [
      {
        id: 'SEC-001',
        severity: 'extreme', // invalid severity
        file: 'app.js',
        line: 1,
        quote: 'const x = 10;',
        fix: '', // empty fix
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 1);
    assert.ok(res.data.failures.some(f => f.error.includes('Invalid severity')));
    assert.ok(res.data.failures.some(f => f.error.includes('Missing or empty "fix"')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Passes with exit 0 when quote is within line drift tolerance (+/- 3 lines)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-drift-'));
  try {
    const code = [
      '// Line 1',
      '// Line 2: Added newline',
      'const target = "sensitive_data";',
      '// Line 4',
    ].join('\n');
    await writeFile(join(dir, 'app.js'), code);
    const findings = [
      {
        id: 'SEC-DRIFT',
        severity: 'high',
        file: 'app.js',
        line: 1, // Cited line 1, but actually on line 3 (+2 lines drift within tolerance)
        quote: 'const target = "sensitive_data";',
        fix: 'Fix data exposure',
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.verified, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Provides suggested_line when quote exists elsewhere in file beyond tolerance', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'verify-suggest-'));
  try {
    const lines = Array(30).fill('// empty line');
    lines[24] = 'function executeCriticalAction() { return true; }';
    await writeFile(join(dir, 'app.js'), lines.join('\n'));
    const findings = [
      {
        id: 'SEC-SUGGEST',
        severity: 'medium',
        file: 'app.js',
        line: 5, // Far from line 25
        quote: 'function executeCriticalAction()',
        fix: 'Add permission check',
      },
    ];
    const findingsPath = join(dir, 'findings.json');
    await writeFile(findingsPath, JSON.stringify(findings));

    const res = runVerifier(findingsPath, ['--base', dir]);
    assert.equal(res.exitCode, 1);
    assert.equal(res.data.verified, false);
    assert.equal(res.data.failures[0].suggested_line, 25);
    assert.match(res.data.failures[0].error, /found on line 25/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
