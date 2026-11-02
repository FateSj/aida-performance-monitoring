import { chromium } from 'playwright';

const url = process.env.TARGET_URL || 'https://aida.iverse.space';
const versionUrl = process.env.VERSION_URL;
const expectedCommit = process.env.EXPECTED_COMMIT;
const report = {
  timestamp: new Date().toISOString(),
  targetUrl: url,
  checks: {},
  metrics: null,
};

async function check(name, action) {
  try {
    report.checks[name] = { status: 'passed', ...(await action()) };
  } catch (error) {
    report.checks[name] = { status: 'failed', error: error.message };
  }
}

await check('health', async () => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (response.status !== 200) throw new Error(`Expected HTTP 200; received ${response.status}`);
  return { httpStatus: response.status };
});

if (!versionUrl && !expectedCommit) {
  report.checks.version = { status: 'skipped', reason: 'VERSION_URL and EXPECTED_COMMIT are not configured' };
} else {
  await check('version', async () => {
    if (!versionUrl || !expectedCommit) throw new Error('Both VERSION_URL and EXPECTED_COMMIT are required');
    const response = await fetch(versionUrl, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Version endpoint returned HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data.commit !== 'string' || data.commit !== expectedCommit) {
      throw new Error(`Commit mismatch: expected ${expectedCommit}, received ${String(data.commit)}`);
    }
    return { commit: data.commit };
  });
}

await check('widget', async () => {
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || response.status() !== 200) throw new Error(`Page returned HTTP ${response?.status() ?? 'unknown'}`);
    // Allow the client application to hydrate before interacting.
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Start a New Chat' }).click({ timeout: 30000 });
    await page.getByRole('button', { name: 'Minimize Chat' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    report.metrics = await page.evaluate(() => ({
      usedJSHeapSize: performance.memory?.usedJSHeapSize ?? null,
      totalJSHeapSize: performance.memory?.totalJSHeapSize ?? null,
      jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit ?? null,
      domNodeCount: document.getElementsByTagName('*').length,
    }));
    return { scenario: 'open-new-chat', settleTimeMs: 3000 };
  } finally {
    await browser.close();
  }
});

report.status = Object.values(report.checks).some(check => check.status === 'failed') ? 'failed' : 'passed';
console.log(JSON.stringify(report, null, 2));
if (report.status === 'failed') process.exitCode = 1;
