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
const SCRIPT_PATH = join(__dirname, '..', 'check-scope.mjs');
const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';

function runScopeCli(scopePath, extraArgs = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, scopePath, ...extraArgs], {
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

test('CLI --help displays usage and exits 0', () => {
  const res = runScopeCli('--help');
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Scope file format/);
});

test('Passes with exit 0 when all modified/untracked files match allowed_files globs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'scope-ok-'));
  try {
    // Init git repo
    execFileSync(gitBin, ['init', '--quiet'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.email', 'test@test.local'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.name', 'Test'], { cwd: dir });

    await mkdir(join(dir, 'src', 'components'), { recursive: true });
    await writeFile(join(dir, 'src', 'index.js'), 'console.log(1);\n');
    await writeFile(join(dir, 'src', 'components', 'Button.jsx'), '<button />\n');
    await writeFile(join(dir, 'README.md'), '# Initial\n');

    execFileSync(gitBin, ['add', '.'], { cwd: dir });
    execFileSync(gitBin, ['commit', '-m', 'initial', '--quiet'], { cwd: dir });

    // Modify a tracked file and add a new untracked file inside allowed scope
    await writeFile(join(dir, 'src', 'index.js'), 'console.log(2);\n');
    await writeFile(join(dir, 'src', 'components', 'Modal.jsx'), '<dialog />\n');

    const scopeConfig = {
      allowed_files: ['src/**/*.js', 'src/**/*.jsx', 'README.md'],
      allow_dependency_changes: false,
    };
    const scopePath = join(dir, 'scope.json');
    await writeFile(scopePath, JSON.stringify(scopeConfig));

    const res = runScopeCli(scopePath, ['--cwd', dir]);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.valid, true);
    assert.ok(res.data.changed_files.includes('src/index.js'));
    assert.ok(res.data.changed_files.includes('src/components/Modal.jsx'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Fails with exit 1 when a file is outside allowed_files scope', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'scope-outside-'));
  try {
    execFileSync(gitBin, ['init', '--quiet'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.email', 'test@test.local'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.name', 'Test'], { cwd: dir });

    await writeFile(join(dir, 'app.js'), 'console.log("app");\n');
    execFileSync(gitBin, ['add', '.'], { cwd: dir });
    execFileSync(gitBin, ['commit', '-m', 'init', '--quiet'], { cwd: dir });

    // Modify file inside scope, but also create unpermitted file outside scope
    await writeFile(join(dir, 'app.js'), 'console.log("app modified");\n');
    await writeFile(join(dir, 'secrets.cfg'), 'forbidden\n');

    const scopeConfig = {
      allowed_files: ['app.js'],
      allow_dependency_changes: false,
    };
    const scopePath = join(dir, 'scope.json');
    await writeFile(scopePath, JSON.stringify(scopeConfig));

    const res = runScopeCli(scopePath, ['--cwd', dir]);
    assert.equal(res.exitCode, 1);
    assert.equal(res.data.valid, false);

    const outsideViolation = res.data.violations.find(v => v.type === 'FILE_OUTSIDE_SCOPE');
    assert.ok(outsideViolation);
    assert.equal(outsideViolation.file, 'secrets.cfg');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Fails with exit 1 when dependency file is modified and allow_dependency_changes is false', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'scope-deps-false-'));
  try {
    execFileSync(gitBin, ['init', '--quiet'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.email', 'test@test.local'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.name', 'Test'], { cwd: dir });

    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }, null, 2));
    execFileSync(gitBin, ['add', '.'], { cwd: dir });
    execFileSync(gitBin, ['commit', '-m', 'init', '--quiet'], { cwd: dir });

    // Modify package.json
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test', dependencies: { bad: '1.0' } }, null, 2));

    const scopeConfig = {
      allowed_files: ['package.json'], // even if allowed_files includes package.json
      allow_dependency_changes: false,
    };
    const scopePath = join(dir, 'scope.json');
    await writeFile(scopePath, JSON.stringify(scopeConfig));

    const res = runScopeCli(scopePath, ['--cwd', dir]);
    assert.equal(res.exitCode, 1);
    assert.equal(res.data.valid, false);

    const depViolation = res.data.violations.find(v => v.type === 'DISALLOWED_DEPENDENCY_CHANGE');
    assert.ok(depViolation, 'Disallowed dependency change must be flagged');
    assert.equal(depViolation.file, 'package.json');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Passes with exit 0 when dependency file is modified and allow_dependency_changes is true', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'scope-deps-true-'));
  try {
    execFileSync(gitBin, ['init', '--quiet'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.email', 'test@test.local'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.name', 'Test'], { cwd: dir });

    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }, null, 2));
    execFileSync(gitBin, ['add', '.'], { cwd: dir });
    execFileSync(gitBin, ['commit', '-m', 'init', '--quiet'], { cwd: dir });

    // Modify package.json
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test', dependencies: { axios: '1.0' } }, null, 2));

    const scopeConfig = {
      allowed_files: ['package.json'],
      allow_dependency_changes: true, // explicitly allowed
    };
    const scopePath = join(dir, 'scope.json');
    await writeFile(scopePath, JSON.stringify(scopeConfig));

    const res = runScopeCli(scopePath, ['--cwd', dir]);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.valid, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Ignores ephemeral test artifacts and custom ignored_files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'scope-ignore-'));
  try {
    execFileSync(gitBin, ['init', '--quiet'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.email', 'test@test.local'], { cwd: dir });
    execFileSync(gitBin, ['config', 'user.name', 'Test'], { cwd: dir });

    await writeFile(join(dir, 'app.js'), 'console.log("clean");\n');
    execFileSync(gitBin, ['add', '.'], { cwd: dir });
    execFileSync(gitBin, ['commit', '-m', 'init', '--quiet'], { cwd: dir });

    // Modify allowed file
    await writeFile(join(dir, 'app.js'), 'console.log("edited");\n');

    // Create untracked ephemeral test database and pytest cache
    await writeFile(join(dir, 'test.db-journal'), 'temp');
    await writeFile(join(dir, 'custom-temp.log'), 'log data');

    const scopeConfig = {
      allowed_files: ['app.js'],
      ignored_files: ['custom-temp.log'],
      allow_dependency_changes: false,
    };
    const scopePath = join(dir, 'scope.json');
    await writeFile(scopePath, JSON.stringify(scopeConfig));

    const res = runScopeCli(scopePath, ['--cwd', dir]);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.valid, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
