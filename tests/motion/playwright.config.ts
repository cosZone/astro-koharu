import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const testDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir,
  globalSetup: path.join(testDir, 'global-setup.ts'),
  testMatch: '*.spec.ts',
  outputDir: process.env.MOTION_OUTPUT_DIR ?? '/tmp/astro-koharu-motion-results',
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.MOTION_BASE_URL ?? 'http://127.0.0.1:4339',
    contextOptions: { reducedMotion: 'no-preference' },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
