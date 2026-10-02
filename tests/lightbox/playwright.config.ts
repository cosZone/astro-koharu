import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.LIGHTBOX_BASE_URL ?? 'http://127.0.0.1:4347';

export default defineConfig({
  testDir: path.dirname(fileURLToPath(import.meta.url)),
  testMatch: '*.spec.ts',
  outputDir: process.env.LIGHTBOX_OUTPUT_DIR ?? '/tmp/astro-koharu-lightbox-results',
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: process.env.LIGHTBOX_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev --host 127.0.0.1 --port 4347',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'touch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
