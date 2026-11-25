import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, '..', 'check-secrets.mjs');
const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';

// Helper to run check-secrets.mjs and capture exit code + stdout + stderr
function runScanner(targetDir, extraArgs = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, targetDir, ...extraArgs], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let data = null;
    try {
      data = JSON.parse(stdout);
    } catch {
      // not JSON (e.g. --help text)
    }
    return { exitCode: 0, stdout, stderr: '', data };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    let data = null;
    try {
      data = JSON.parse(stdout);
    } catch {
      // not JSON
    }
    return { exitCode: err.status, stdout, stderr, data };
  }
}

test('CLI --help option outputs usage documentation and exits 0', () => {
  const res = runScanner('.', ['--help']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Usage:/);
  assert.match(res.stdout, /Exit Codes:/);
});

test('Invalid directory exits with code 2', async () => {
  const nonexistent = join(tmpdir(), `nonexistent-dir-${Date.now()}`);
  const res = runScanner(nonexistent);
  assert.equal(res.exitCode, 2);
  assert.match(res.stderr, /Path does not exist/);
});

test('Case A: CSS class names containing "sk-" inside slugs are NOT flagged as OpenAI keys', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'test-case-a-'));
  try {
    const cssContent = [
      '.task-management-dashboard-component-wrapper { display: flex; }',
      '.app-sk-dashboard-container-fluid { margin: 0; }',
      '/* sk-placeholder-class-name-without-real-key */',
    ].join('\n');
    await writeFile(join(dir, 'styles.css'), cssContent);

    const res = runScanner(dir);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.findings.length, 0, 'Should have 0 findings for CSS class names');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Case B: Public-by-design keys (Supabase anon JWT, Stripe pk_, Firebase web apiKey) are severity "info"', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'test-case-b-'));
  try {
    // 1. Build Supabase anon JWT at runtime from string pieces (Rule 3)
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const anonPayload = Buffer.from(JSON.stringify({ iss: 'supabase', ref: 'project', role: 'anon' })).toString('base64url');
    const fakeSig = ['fake', 'signature', '1234567890'].join('_');
    const anonJwt = [jwtHeader, anonPayload, fakeSig].join('.');

    // 2. Build Stripe publishable key from pieces
    const stripePk = ['pk', 'live', '1234567890abcdefABCDEF12'].join('_');

    // 3. Build Firebase web API key from pieces (AIza + 35 chars = 39 chars total)
    const firebaseKey = 'AIza' + 'B'.repeat(35);

    const fileContent = [
      `const SUPABASE_ANON_KEY = "${anonJwt}";`,
      `const STRIPE_PK = "${stripePk}";`,
      `const firebaseConfig = { ${'api' + 'Key'}: "${firebaseKey}", appId: "1:123:web:abc" };`,
    ].join('\n');

    await writeFile(join(dir, 'public-config.js'), fileContent);

    const res = runScanner(dir);
    // Since all are severity "info", exit code should be 0 (clean, no actionable secrets)
    assert.equal(res.exitCode, 0, 'Info findings do not cause non-zero exit code');

    const supabaseFinding = res.data.findings.find(f => f.pattern.includes('Supabase Anon'));
    assert.ok(supabaseFinding, 'Should detect Supabase Anon Key');
    assert.equal(supabaseFinding.severity, 'info');
    assert.ok(supabaseFinding.note.includes('Row Level Security'));

    const stripeFinding = res.data.findings.find(f => f.pattern.includes('Stripe Publishable'));
    assert.ok(stripeFinding, 'Should detect Stripe Publishable Key');
    assert.equal(stripeFinding.severity, 'info');

    const firebaseFinding = res.data.findings.find(f => f.pattern.includes('Firebase Web'));
    assert.ok(firebaseFinding, 'Should detect Firebase Web Key');
    assert.equal(firebaseFinding.severity, 'info');

    // Also verify that a service_role JWT is NOT info, but CRITICAL
    const servicePayload = Buffer.from(JSON.stringify({ iss: 'supabase', role: 'service_role' })).toString('base64url');
    const serviceJwt = [jwtHeader, servicePayload, fakeSig].join('.');
    await writeFile(join(dir, 'admin.js'), `const SERVICE_ROLE = "${serviceJwt}";`);

    const resService = runScanner(dir);
    assert.equal(resService.exitCode, 1, 'Service role JWT must cause exit code 1');
    const serviceFinding = resService.data.findings.find(f => f.pattern.includes('Service Role'));
    assert.ok(serviceFinding, 'Should detect Supabase Service Role Key');
    assert.equal(serviceFinding.severity, 'critical');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Case C: Git-ignored .env is moved to local_only_notes; unignored .env is a critical finding', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'test-case-c-'));
  try {
    // Initialize a git repo in dir
    execFileSync(gitBin, ['init', '--quiet'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.email', 'test@test.local'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.name', 'Test'], { cwd: dir });

    // 1. Git-ignored .env
    await writeFile(join(dir, '.gitignore'), '.env\n');
    await writeFile(join(dir, '.env'), 'DATABASE_SECRET=localdevsecret123\n');
    await writeFile(join(dir, 'README.md'), '# Test\n');
    execFileSync(gitBin, ['add', '.gitignore', 'README.md'], { cwd: dir });
    execFileSync(gitBin, ['commit', '-m', 'init', '--quiet'], { cwd: dir });

    const resIgnored = runScanner(dir);
    assert.equal(resIgnored.exitCode, 0, 'Git-ignored .env should not exit with code 1');
    assert.equal(resIgnored.data.findings.length, 0, 'Git-ignored .env must not appear in findings');
    assert.equal(resIgnored.data.local_only_notes.length, 1, 'Git-ignored .env must be in local_only_notes');
    assert.match(resIgnored.data.local_only_notes[0].note, /Git-ignored local file/);
    assert.equal(resIgnored.data.local_only_notes[0].snippet, undefined, 'Must not print .env content');

    // 2. Unignored .env.production
    await writeFile(join(dir, '.env.production'), 'PROD_SECRET=leaked123\n');
    const resUnignored = runScanner(dir);
    assert.equal(resUnignored.exitCode, 1, 'Unignored .env file must exit with code 1');
    const committedFinding = resUnignored.data.findings.find(f => f.pattern === 'Sensitive file committed');
    assert.ok(committedFinding, 'Unignored .env must be reported in findings');
    assert.equal(committedFinding.severity, 'critical');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Case D: Reports hardcoded literal secret in process.env.KEY || "literal" fallback', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'test-case-d-'));
  try {
    // Build secret from runtime parts
    const part1 = ['sk', 'live'].join('_');
    const part2 = ['51FakeLiveSecretKey', 'Part1234567890'].join('');
    const fullKey = `${part1}_${part2}`;

    const code = [
      `const apiKey = process.` + `env.STRIPE_KEY || "${fullKey}";`,
      `const dbPass = process.` + `env.DB_PASSWORD || "hardcoded_secret_fallback_password";`,
      `const harmless = process.` + `env.NODE_ENV || "development";`,
    ].join('\n');

    await writeFile(join(dir, 'app.js'), code);

    const res = runScanner(dir);
    assert.equal(res.exitCode, 1, 'Hardcoded fallback must cause exit 1');

    const stripeMatch = res.data.findings.find(f => f.pattern.includes('Stripe Secret'));
    assert.ok(stripeMatch, 'Should find Stripe Secret Key in fallback');

    const fallbackMatch = res.data.findings.find(f => f.pattern.includes('Fallback') || f.pattern.includes('Generic'));
    assert.ok(fallbackMatch, 'Should find generic fallback secret');

    // Harmless "development" fallback should NOT be flagged
    const devFinding = res.data.findings.find(f => f.snippet && f.snippet.includes('dev'));
    assert.equal(devFinding, undefined, '"development" fallback must not be flagged');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Case E: Safely handles directory paths with spaces and avoids shell injection', async () => {
  const dirWithSpace = await mkdtemp(join(tmpdir(), 'test dir with spaces '));
  try {
    await writeFile(join(dirWithSpace, 'index.js'), 'console.log("hello world");\n');
    const res = runScanner(dirWithSpace);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.findings.length, 0);
  } finally {
    await rm(dirWithSpace, { recursive: true, force: true });
  }
});

test('Clean project with zero findings exits 0 with empty findings array', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clean-project-'));
  try {
    await writeFile(join(dir, 'index.html'), '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>');
    await writeFile(join(dir, 'app.js'), 'const count = 42;\nconsole.log(count);\n');
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'clean', version: '1.0.0' }, null, 2));

    const res = runScanner(dir);
    assert.equal(res.exitCode, 0);
    assert.deepEqual(res.data.findings, []);
    assert.deepEqual(res.data.warnings, []);
    assert.deepEqual(res.data.local_only_notes, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
