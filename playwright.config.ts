import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E + visual config.
 *
 * Local (Asahi/Fedora) reuses a system Chromium-based browser via CHROMIUM_BIN so we
 * don't download Playwright's bundled browser. CI runs `npx playwright install chromium`
 * and leaves CHROMIUM_BIN unset to use the bundled build.
 *
 * Browser priority per workspace CLAUDE.md: thorium-browser → chromium-browser →
 * chromium → google-chrome. All are Chromium-engine, so any is fine here — just don't
 * hardcode one that may not exist on a given machine.
 */
const SYSTEM_BROWSER_CANDIDATES = [
  '/home/jeffreyj/.local/bin/thorium-browser',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
];
const channelExe = process.env.CHROMIUM_BIN
  || (process.env.CI ? undefined : SYSTEM_BROWSER_CANDIDATES.find(existsSync));

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
