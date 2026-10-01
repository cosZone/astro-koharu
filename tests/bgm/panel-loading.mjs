import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from '@playwright/test';

// Run against a dev/preview server; playlist and lyric responses are controlled locally.
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const browsers = { chromium, firefox, webkit };
const cases = [
  { width: 1280, height: 900, theme: 'dark', reopen: false },
  { width: 390, height: 844, theme: 'light', reopen: true },
  { width: 390, height: 667, theme: 'dark', reopen: false, reduced: true },
];

for (const name of (process.env.BROWSERS ?? 'chromium').split(',')) {
  assert.ok(browsers[name], `Unknown browser: ${name}`);
  const browser = await browsers[name].launch();
  try {
    for (const scenario of cases) {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: scenario.height },
        reducedMotion: scenario.reduced ? 'reduce' : 'no-preference',
      });
      let releasePlaylist;
      let releaseLyrics;
      const playlistGate = new Promise((resolve) => {
        releasePlaylist = resolve;
      });
      const lyricsGate = new Promise((resolve) => {
        releaseLyrics = resolve;
      });
      try {
        await context.addInitScript(({ theme, reduced }) => {
          localStorage.setItem('theme', theme);
          localStorage.setItem('site-motion-level', reduced ? 'reduced' : 'lively');
        }, scenario);
        // Real Meting playlists can return HTTP lyric links even from an HTTPS API.
        const lyricURL =
          scenario.width === 1280
            ? 'http://163.hyc.moe/?server=netease&type=lrc&id=42&format=lrc'
            : new URL('/__bgm_test__/lyrics.lrc', baseURL).href;
        const resolvedLyricURL = lyricURL.replace(/^http:\/\/163\.hyc\.moe\//, 'https://163.hyc.moe/');
        const songs = Array.from({ length: 8 }, (_, index) => ({
          name: `测试曲目 ${index + 1}`,
          artist: '测试歌手',
          url: new URL(`/__bgm_test__/${index}.mp3`, baseURL).href,
          pic: '',
          lrc: lyricURL,
        }));
        let requests = 0;
        await context.route('https://163.hyc.moe/**', async (route) => {
          requests++;
          await playlistGate;
          await route.fulfill({ json: songs });
        });
        if (resolvedLyricURL !== lyricURL) await context.route(lyricURL, (route) => route.abort());
        await context.route(resolvedLyricURL, async (route) => {
          await lyricsGate;
          await route.fulfill({ body: '[00:00.00]第一行歌词\n[00:20.00]第二行歌词', contentType: 'text/plain' });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(30000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
        if (scenario.width < 992) await page.getByRole('button', { name: '展开/收起工具栏', exact: true }).click();
        const toggle = page.getByRole('button', { name: '背景音乐', exact: true });
        const panel = page.locator('.bgm-panel');
        const waitForEntrance = () =>
          page.waitForFunction(() => {
            const panel = document.querySelector('.bgm-panel');
            if (!panel) return false;
            const style = getComputedStyle(panel.parentElement);
            return style.opacity === '1' && style.transform === 'none';
          });
        await toggle.click();
        await panel.locator('.audio-player-loading').waitFor();
        await waitForEntrance();
        const loading = await panel.boundingBox();
        assert.ok(loading);
        assert.ok(loading.y >= 56 && loading.y + loading.height <= scenario.height, 'panel exceeds the usable viewport');
        const background = await panel.evaluate((node) => getComputedStyle(node).backgroundColor);
        assert.notEqual(background, 'rgba(0, 0, 0, 0)', 'loading surface is transparent');
        const initialRequests = requests;

        if (scenario.reopen) {
          await page.getByRole('button', { name: '关闭面板', exact: true }).click();
          await panel.waitFor({ state: 'detached' });
          await toggle.click();
          await panel.waitFor();
          await waitForEntrance();
        }

        await page.evaluate(() => {
          const trace = { frames: [], sampling: true };
          window.bgmAnimationTrace = trace;
          function sample() {
            const panel = document.querySelector('.bgm-panel');
            if (panel) {
              const box = panel.getBoundingClientRect();
              trace.frames.push({ x: box.x, y: box.y, width: box.width, height: box.height });
            }
            if (trace.sampling) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        });
        releasePlaylist();
        await panel.locator('.audio-player-song-item').first().waitFor();
        const beforeLyrics = await panel.locator('.audio-player-controls').boundingBox();
        releaseLyrics();
        await panel.locator('.audio-player-lrc p').first().waitFor();
        await page.waitForTimeout(250);
        const afterLyrics = await panel.locator('.audio-player-controls').boundingBox();
        const frames = await page.evaluate(() => {
          window.bgmAnimationTrace.sampling = false;
          return window.bgmAnimationTrace.frames;
        });
        for (const frame of frames) {
          for (const property of ['x', 'y', 'width', 'height']) {
            assert.ok(Math.abs(frame[property] - loading[property]) < 2, `${property} jumps during loading`);
          }
        }
        assert.ok(Math.abs(beforeLyrics.y - afterLyrics.y) < 2, 'lyrics arriving pushes playback controls');
        assert.equal(requests, initialRequests, 'reopening duplicates the playlist request');
        assert.deepEqual(errors, []);
        await page.keyboard.press('Escape');
        await panel.waitFor({ state: 'detached' });
        await toggle.click();
        await panel.locator('.audio-player-song-item').first().waitFor();
        assert.equal(await panel.locator('.audio-player-loading').count(), 0, 'cached reopening flashes loading state');
        assert.equal(requests, initialRequests);
        console.log(`PASS ${name} ${JSON.stringify(scenario)}`);
      } finally {
        releasePlaylist();
        releaseLyrics();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
