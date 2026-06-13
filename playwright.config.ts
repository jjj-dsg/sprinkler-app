import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E + visual config.
 *
 * Local (Asahi/Fedora) reuses the system Chromium via CHROMIUM_BIN so we don't
 * download Playwright's bundled browser. CI runs `npx playwright install chromium`
 * and leaves CHROMIUM_BIN unset to use the bundled build.
 */
const channelExe = process.env.CHROMIUM_BIN || (process.env.CI ? undefined : '/usr/bin/chromium-browser');

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4317',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: channelExe ? { executablePath: channelExe } : {},
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4317 --strictPort',
    url: 'http://localhost:4317',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
