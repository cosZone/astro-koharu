/**
 * Renders the README feature cards to docs/assets/*.zh.webp.
 *
 *   node docs/design/readme-feature-overview/render.mjs
 *
 * Needs `cwebp` (libwebp). Screenshots in shots/ come from the demo site build.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = fileURLToPath(new URL('.', import.meta.url));
const assets = path.join(here, '../../assets');
const cards = {
  'index.html': 'readme-feature-overview.zh.webp',
  'markdown.html': 'readme-feature-markdown.zh.webp',
  'organize.html': 'readme-feature-organize.zh.webp',
  'media.html': 'readme-feature-media.zh.webp',
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
for (const [source, target] of Object.entries(cards)) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(pathToFileURL(path.join(here, source)).href);
  // Cards may set their own body height.
  await page.setViewportSize({ width: 1600, height: await page.evaluate(() => document.body.offsetHeight) });
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
  const png = path.join(os.tmpdir(), `${path.parse(source).name}.png`);
  await page.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', path.join(assets, target)]);
  fs.rmSync(png);
  console.log(`${target}: ${(fs.statSync(path.join(assets, target)).size / 1024).toFixed(0)} KB`);
}
await browser.close();
