import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const regressionStorage = mkdtempSync(join(tmpdir(), 'wdf-m3-regression-'));
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
export default defineConfig({
  testDir: './tests/m3',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/m3-browser.json' }],
  ],
  outputDir: 'test-results/m3-browser',
  use: {
    browserName: 'chromium',
    headless: true,
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1100 },
    baseURL: 'http://127.0.0.1:5175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Repaint complete tiles: partial raster reuse can change SVG/curve edge coverage.
    // R01 compares every pixel with its original tolerance.
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--disable-gpu', '--disable-partial-raster'],
    },
  },
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
    },
    {
      command: 'npm run ui-lab --workspace @wdf/task-manager',
      env: { WDF_LAB_STORAGE_DIR: regressionStorage },
      url: 'http://127.0.0.1:5175',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
      reuseExistingServer: false,
    },
  ],
});
