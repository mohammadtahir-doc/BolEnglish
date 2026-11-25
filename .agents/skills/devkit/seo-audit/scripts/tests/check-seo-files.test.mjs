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
const SCRIPT_PATH = join(__dirname, '..', 'check-seo-files.mjs');

function runSeoChecker(targetDir, extraArgs = []) {
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
  const res = runSeoChecker('.', ['--help']);
  assert.equal(res.exitCode, 0);
  assert.match(res.stdout, /Checks:/);
});

test('Clean SEO fixture produces zero findings and exits 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clean-seo-'));
  try {
    const robotsContent = `User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
`;
    await writeFile(join(dir, 'robots.txt'), robotsContent);

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
</urlset>`;
    await writeFile(join(dir, 'sitemap.xml'), sitemapContent);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Clean SEO Page Example</title>
  <link rel="canonical" href="https://example.com/">
  <meta property="og:title" content="Clean SEO Page Example">
  <meta property="og:description" content="This is an informative open graph description.">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Clean SEO Corp",
    "url": "https://example.com"
  }
  </script>
</head>
<body>
  <h1>Welcome to Clean SEO Corp</h1>
  <p>Here is abundant pre-rendered text for crawlers and answer engines to extract cleanly without executing JavaScript.</p>
</body>
</html>`;
    await writeFile(join(dir, 'index.html'), htmlContent);

    const res = runSeoChecker(dir);
    assert.equal(res.exitCode, 0, 'Clean SEO fixture must exit 0');
    assert.equal(res.data.total_findings, 0);
    assert.deepEqual(res.data.findings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Flags missing robots.txt sitemap, sitemap fragments, missing canonical, broken JSON-LD, and client-only SPA', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bad-seo-'));
  try {
    // 1. robots.txt with no sitemap directive
    await writeFile(join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /admin\n');

    // 2. sitemap.xml with fragment (#) and multiple hosts
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page#section-one</loc>
  </url>
  <url>
    <loc>https://otherdomain.org/about</loc>
  </url>
</urlset>`;
    await writeFile(join(dir, 'sitemap.xml'), sitemapContent);

    // 3. HTML page with client-only SPA root, missing canonical, missing OG tags, broken JSON-LD
    const badHtml = `<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article"
  }
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    await writeFile(join(dir, 'index.html'), badHtml);

    const res = runSeoChecker(dir);
    assert.equal(res.exitCode, 1, 'Must exit 1 when SEO issues found');
    assert.ok(res.data.total_findings >= 6);

    const rulesFound = new Set(res.data.findings.map(f => f.rule));
    assert.ok(rulesFound.has('ROBOTS_MISSING_SITEMAP'), 'Should detect robots.txt missing Sitemap: line');
    assert.ok(rulesFound.has('SITEMAP_URL_FRAGMENT'), 'Should detect sitemap URL with # fragment');
    assert.ok(rulesFound.has('SITEMAP_MULTIPLE_HOSTS'), 'Should detect sitemap with multiple hosts');
    assert.ok(rulesFound.has('MISSING_CANONICAL'), 'Should detect missing canonical link');
    assert.ok(rulesFound.has('MISSING_OG_TAGS'), 'Should detect missing Open Graph tags');
    assert.ok(rulesFound.has('JSONLD_MISSING_REQUIRED_PROP'), 'Should detect Article missing headline/author');
    assert.ok(rulesFound.has('CLIENT_ONLY_RENDERING'), 'Should detect client-only SPA with empty root div');

    // Check structure of each finding
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
