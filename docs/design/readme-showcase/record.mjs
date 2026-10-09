/**
 * Records the README showcase clips (docs/assets/showcase/*.webp).
 *
 *   pnpm build && node docs/design/readme-showcase/record.mjs [scene...]
 *
 * Serves the build with `astro preview`, captures each scene with CDP screencast
 * (real frame timing, sharper than Playwright's video) and encodes an animated
 * WebP with ffmpeg (needs the libwebp_anim encoder).
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { scenes } from './scenes.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const outDir = path.join(root, 'docs/assets/showcase');
const framesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'koharu-showcase-'));
const PORT = 4392;
const base = `http://localhost:${PORT}`;
const only = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureFrames(browser, name, scene) {
  const { width = 1280, height = 800, scale = 1, mobile = false } = scene.viewport ?? {};
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await ctx.newPage();
  await scene.setup?.(page, base);
  const dir = path.join(framesRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width * scale, maxHeight: height * scale });
  const start = Date.now() / 1000;
  await scene.run(page, base, sleep);
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await sleep(200);
  await ctx.close();
  // Skip the white frames painted before the first load.
  while (frames.length > 1) {
    const mean = Number(
      execFileSync('magick', [frames[0].file, '-resize', '64x', '-colorspace', 'gray', '-format', '%[fx:mean]', 'info:']),
    );
    if (mean < 0.97) break;
    frames.shift();
  }
  if (!frames.length) throw new Error('no frames captured');
  const last = end + (frames[0].t - start);
  const list = frames.flatMap(({ file, t }, i) => [
    `file '${file}'`,
    `duration ${Math.max(0.001, (frames[i + 1]?.t ?? last) - t).toFixed(4)}`,
  ]);
  list.push(`file '${frames.at(-1).file}'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
  return path.join(dir, 'list.txt');
}

function encode(name, list, { outWidth = 720, quality = 60, maxSeconds } = {}) {
  const out = path.join(outDir, `${name}.webp`);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    list,
    ...(maxSeconds ? ['-t', String(maxSeconds)] : []),
    '-vf',
    `fps=16,scale=${outWidth}:-2:flags=lanczos`,
    '-c:v',
    'libwebp_anim',
    '-quality',
    String(quality),
    '-compression_level',
    '6',
    '-loop',
    '0',
    out,
  ]);
  console.log(`${name}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

const server = spawn('pnpm', ['exec', 'astro', 'preview', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) {
    if (
      await fetch(base)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await sleep(500);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, scene] of Object.entries(scenes)) {
    if (only.length && !only.includes(name)) continue;
    try {
      encode(name, await captureFrames(browser, name, scene), scene.encode);
    } catch (error) {
      console.error(`${name}: ${error.message.split('\n')[0]}`);
    }
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
  fs.rmSync(framesRoot, { recursive: true, force: true });
}
