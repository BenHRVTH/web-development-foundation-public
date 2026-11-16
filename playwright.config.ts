import { defineConfig } from '@playwright/test';

const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/browser.json' }],
  ],
  outputDir: 'test-results/browser',
  use: {
    browserName: 'chromium',
    headless: true,
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'components',
      testMatch: /m2-components.spec.ts/,
      use: { baseURL: 'http://127.0.0.1:5174' },
    },
    {
      name: 'dev',
      testIgnore: /m2-components.spec.ts/,
      use: { baseURL: 'http://127.0.0.1:5173' },
    },
    {
      name: 'production',
      testIgnore: /m2-components.spec.ts/,
      use: { baseURL: 'http://127.0.0.1:4173' },
    },
  ],
  webServer: [
    {
      command: 'npm run test:fixtures',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
  ],
});
