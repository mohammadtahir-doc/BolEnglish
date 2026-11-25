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
const SCRIPT_PATH = join(__dirname, '..', 'check-html.mjs');

function runHtmlChecker(targetDir, extraArgs = []) {
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
  const res = runHtmlChecker('.', ['--help']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Checks:/);
});

test('Clean HTML document produces zero findings and exits 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clean-html-'));
  try {
    const cleanDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proper Site Title with Good Context</title>
  <meta name="description" content="This is a fully compliant and clean description between fifty and one hundred sixty characters long.">
</head>
<body>
  <h1>Primary Heading Here</h1>
  <img src="photo.jpg" alt="A descriptive description of photo" width="800" height="600">
  <form>
    <label for="email-field">Email address</label>
    <input id="email-field" type="email">
    <a href="/login">Log in here</a>
  </form>
</body>
</html>`;
    await writeFile(join(dir, 'index.html'), cleanDoc);

    const res = runHtmlChecker(dir);
    assert.equal(res.exitCode, 0, 'Clean HTML must exit 0');
    assert.equal(res.data.total_findings, 0);
    assert.deepEqual(res.data.findings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Flags missing title, short meta description, missing viewport, multiple h1s, unlabeled inputs, and broken links', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bad-html-'));
  try {
    const badDoc = `<!DOCTYPE html>
<html>
<head>
  <meta name="description" content="Too short">
</head>
<body>
  <h1>First Heading</h1>
  <h1>Second Heading</h1>
  <img src="avatar.jpg">
  <input type="text">
  <a href="#">Broken link</a>
</body>
</html>`;
    await writeFile(join(dir, 'broken.html'), badDoc);

    // Also a JSX component to verify confidence = "heuristic"
    const badJsx = `export function Card() {
  return (
    <div>
      <img src="test.png" />
      <input type="search" />
      <a href="#">Click</a>
    </div>
  );
}`;
    await writeFile(join(dir, 'Card.jsx'), badJsx);

    const res = runHtmlChecker(dir);
    assert.equal(res.exitCode, 1, 'Must exit 1 when issues found');
    assert.ok(res.data.total_findings >= 7);

    const rulesFound = new Set(res.data.findings.map(f => f.rule));
    assert.ok(rulesFound.has('MISSING_HTML_LANG'));
    assert.ok(rulesFound.has('MISSING_TITLE'));
    assert.ok(rulesFound.has('MISSING_VIEWPORT_META'));
    assert.ok(rulesFound.has('META_DESCRIPTION_LENGTH'));
    assert.ok(rulesFound.has('MULTIPLE_H1'));
    assert.ok(rulesFound.has('IMG_MISSING_ALT'));
    assert.ok(rulesFound.has('IMG_MISSING_DIMENSIONS'));
    assert.ok(rulesFound.has('UNLABELED_INPUT'));
    assert.ok(rulesFound.has('BROKEN_HASH_LINK'));

    // Check confidence tag: HTML should be deterministic, JSX should be heuristic
    const htmlFinding = res.data.findings.find(f => f.file.endsWith('.html'));
    assert.equal(htmlFinding.confidence, 'deterministic');

    const jsxFinding = res.data.findings.find(f => f.file.endsWith('.jsx'));
    assert.equal(jsxFinding.confidence, 'heuristic');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
