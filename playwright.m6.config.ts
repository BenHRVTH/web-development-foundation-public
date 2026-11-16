import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/m6',
  outputDir: 'test-results/m6-browser',
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 900000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/m6-browser.json' }],
  ],
  use: {
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1100 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
        ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] }
        : {}),
      args: ['--disable-gpu', '--disable-partial-raster'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
