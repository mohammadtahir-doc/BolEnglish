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
const SCRIPT_PATH = join(__dirname, '..', 'lint-design.mjs');

function runLinter(targetDir, extraArgs = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, targetDir, ...extraArgs], {
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
  const res = runLinter('.', ['--help']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Checks:/);
});

test('Clean design fixture produces zero findings and exits 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clean-design-'));
  try {
    const cleanCss = `
:root {
  --color-brand: #3b82f6;
  --color-neutral-900: #0f172a;
}
html, body {
  overflow-x: clip;
  width: 100%;
}
button {
  transition: transform 150ms ease-out, opacity 150ms ease-out;
  outline: 2px solid transparent;
}
button:focus-visible {
  outline: 2px solid var(--color-brand);
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
`;
    await writeFile(join(dir, 'tokens.css'), cleanCss);

    const cleanHtml = `
<!DOCTYPE html>
<html>
<body>
  <button type="button">Click me</button>
</body>
</html>
`;
    await writeFile(join(dir, 'index.html'), cleanHtml);

    const res = runLinter(dir);
    assert.equal(res.exitCode, 0, 'Clean fixture must exit 0');
    assert.equal(res.data.total_findings, 0);
    assert.deepEqual(res.data.findings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Flags literal colors, transition-all, overflow-hidden on body, width 100vw, and div onClick', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'slop-design-'));
  try {
    const slopCss = `
body {
  overflow-x: hidden;
  width: 100vw;
  background-color: #ff0055;
  transition: all 0.3s ease;
  outline: none;
}
@keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }
`;
    await writeFile(join(dir, 'slop.css'), slopCss);

    const slopHtml = `
<div onClick={() => doSomething()} className="transition-all bg-[#123456] w-[100vw]">
  Clickable card
</div>
`;
    await writeFile(join(dir, 'Card.jsx'), slopHtml);

    const res = runLinter(dir);
    assert.equal(res.exitCode, 1, 'Must exit 1 when findings are present');
    assert.ok(res.data.total_findings >= 6, `Expected at least 6 findings, got ${res.data.total_findings}`);

    const rulesFound = new Set(res.data.findings.map(f => f.rule));
    assert.ok(rulesFound.has('LITERAL_COLOR'), 'Should detect literal color in CSS');
    assert.ok(rulesFound.has('TRANSITION_ALL'), 'Should detect transition: all');
    assert.ok(rulesFound.has('OVERFLOW_HIDDEN_ROOT'), 'Should detect overflow-x: hidden on body');
    assert.ok(rulesFound.has('WIDTH_100VW'), 'Should detect width: 100vw');
    assert.ok(rulesFound.has('OUTLINE_REMOVED'), 'Should detect outline removed without focus-visible');
    assert.ok(rulesFound.has('DIV_ONCLICK'), 'Should detect div onClick');
    assert.ok(rulesFound.has('LITERAL_COLOR_TAILWIND'), 'Should detect Tailwind arbitrary color');
    assert.ok(rulesFound.has('MISSING_REDUCED_MOTION'), 'Should detect keyframes without prefers-reduced-motion');

    // Check each finding has file, line, quote, fix
    for (const f of res.data.findings) {
      assert.ok(f.id);
      assert.ok(f.file);
      assert.ok(Number.isInteger(f.line) && f.line >= 1);
      assert.ok(f.quote && f.quote.length > 0);
      assert.ok(f.fix && f.fix.length > 0);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
