/* global document, innerWidth */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const server = await createServer({
  server: { host: '127.0.0.1', port: 5183, strictPort: true },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
    args: ['--disable-gpu', '--disable-partial-raster'],
  });
  const context = await browser.newContext({
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const rows = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5183');
    await page
      .getByRole('heading', { name: 'Figyeljünk együtt.', exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    assert.deepEqual(axe.violations, []);
    rows.push({
      width,
      status: 'PASS',
      axePasses: axe.passes.length,
      incomplete: axe.incomplete.map((i) => i.id),
    });
  }
  await writeFile(
    'qa-browser-results.json',
    JSON.stringify(
      { status: 'PASS', chromium: browser.version(), rows },
      null,
      2,
    ) + '\n',
  );
  console.log('Project browser hook: five real renders, overflow and axe PASS');
} finally {
  await browser?.close();
  await server.close();
}
