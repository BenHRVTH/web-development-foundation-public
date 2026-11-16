import { defineConfig } from '@playwright/test';
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
export default defineConfig({
  testDir: './tests/m5',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 720000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/m5-browser.json' }],
  ],
  outputDir: 'test-results/m5-browser',
  use: {
    actionTimeout: 15000,
    navigationTimeout: 20000,
    browserName: 'chromium',
    headless: true,
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1100 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--disable-gpu', '--disable-partial-raster'],
    },
  },
});
