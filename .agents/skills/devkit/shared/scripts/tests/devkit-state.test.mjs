import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, '..', 'devkit-state.mjs');

function runStateCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, ...args], {
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
  const res = runStateCli(['--help']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Commands:/);
});

test('init creates a valid state.json from template', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devkit-state-init-'));
  const statePath = join(dir, 'state.json');
  try {
    const res = runStateCli(['init', '--state', statePath, '--skill', 'security-audit', '--mode', 'lite']);
    assert.equal(res.exitCode, 0);

    const valRes = runStateCli(['validate', '--state', statePath]);
    assert.equal(valRes.exitCode, 0);
    assert.equal(valRes.data.valid, true);

    const getSkill = runStateCli(['get', '--state', statePath, 'skill']);
    assert.equal(getSkill.stdout.trim(), 'security-audit');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('get and set update nested fields', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devkit-state-set-'));
  const statePath = join(dir, 'state.json');
  try {
    runStateCli(['init', '--state', statePath]);

    // set a scalar
    const setRes = runStateCli(['set', '--state', statePath, 'decisions', JSON.stringify([{ id: 1, text: 'approved' }])]);
    assert.equal(setRes.exitCode, 0);

    // get the updated array
    const getRes = runStateCli(['get', '--state', statePath, 'decisions']);
    assert.equal(getRes.exitCode, 0);
    assert.equal(getRes.data.length, 1);
    assert.equal(getRes.data[0].text, 'approved');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('advance REFUSES when evidence is empty (exit code 1)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devkit-state-no-ev-'));
  const statePath = join(dir, 'state.json');
  try {
    runStateCli(['init', '--state', statePath]);

    // Phase 0 (inventory) has null evidence by default
    const res = runStateCli(['advance', '--state', statePath]);
    assert.equal(res.exitCode, 1, 'Must exit 1 when evidence is missing');
    assert.match(res.stderr, /REFUSAL_EMPTY_EVIDENCE/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('advance REFUSES when approval gate is not approved_by_user (exit code 1)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devkit-state-no-app-'));
  const statePath = join(dir, 'state.json');
  try {
    // Custom phases where first phase requires approval
    runStateCli(['init', '--state', statePath, '--phases', 'plan,fix,verify']);

    // Provide evidence, but do NOT approve
    runStateCli(['set', '--state', statePath, 'phases[0].evidence', 'Found 3 items to fix']);

    const res = runStateCli(['advance', '--state', statePath]);
    assert.equal(res.exitCode, 1, 'Must exit 1 when approval is required but not granted');
    assert.match(res.stderr, /REFUSAL_APPROVAL_REQUIRED/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('advance SUCCEEDS when evidence is provided and approval is granted', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devkit-state-ok-'));
  const statePath = join(dir, 'state.json');
  try {
    runStateCli(['init', '--state', statePath, '--phases', 'plan,fix,verify']);

    // 1. Provide evidence and user approval
    runStateCli(['set', '--state', statePath, 'phases[0].evidence', 'Plan approved with 2 items']);
    runStateCli(['set', '--state', statePath, 'phases[0].approved_by_user', 'true']);

    const res = runStateCli(['advance', '--state', statePath]);
    assert.equal(res.exitCode, 0);
    assert.equal(res.data.status, 'advanced');
    assert.equal(res.data.completed_phase, 'plan');
    assert.equal(res.data.next_phase, 'fix');

    // 2. Advance non-approval phase (fix) with evidence
    runStateCli(['set', '--state', statePath, 'phases[1].evidence', 'Fixed items 1 and 2']);
    const resFix = runStateCli(['advance', '--state', statePath]);
    assert.equal(resFix.exitCode, 0);
    assert.equal(resFix.data.next_phase, 'verify');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
