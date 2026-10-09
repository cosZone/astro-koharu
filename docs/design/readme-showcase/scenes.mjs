// Scenes for record.mjs: optional viewport / encode options, setup() before capture, run() while recording.
const wheel = async (page, dy, ms) => {
  const steps = Math.max(1, Math.round(ms / 16));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(16);
  }
};
const hoverText = async (page, text, sleep, wait = 500) => {
  const b = await page
    .locator('nav a, nav button', { hasText: text })
    .first()
    .boundingBox({ timeout: 3000 })
    .catch(() => null);
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await sleep(wait);
};
const ready = async (page, url) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
};

export const scenes = {
  // 封面樱花 + 下滑后浮起的胶囊头部
  home: {
    encode: { quality: 50 },
    async run(page, base, sleep) {
      await page.goto(base + '/', { waitUntil: 'load' });
      await page.mouse.move(900, 300);
      await sleep(2600);
      await wheel(page, 760, 1300);
      await sleep(500);
      await wheel(page, -160, 400);
      await sleep(1400);
    },
  },
  // 圆形扩散的主题切换（夜樱配色）
  theme: {
    async setup(page, base) {
      await ready(page, base + '/');
      await page.mouse.wheel(0, 640);
      await page.waitForTimeout(700);
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(900);
    },
    async run(page, base, sleep) {
      const t = page.locator('[aria-label="切换主题"]').first();
      const b = await t.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
      await sleep(400);
      await t.click();
      await sleep(1800);
      await wheel(page, 300, 700);
      await sleep(600);
      await wheel(page, -120, 300);
      await sleep(500);
      await t.click();
      await sleep(1600);
    },
  },
  // 丝线目录：阅读进度随章节移动
  toc: {
    encode: { maxSeconds: 10 },
    async setup(page, base) {
      await ready(page, base + '/post/astro-koharu-guide');
      await page.mouse.wheel(0, 640);
      await page.waitForTimeout(1200);
    },
    async run(page, base, sleep) {
      await page.mouse.move(800, 500);
      await sleep(400);
      for (let i = 0; i < 6; i++) {
        await wheel(page, 520, 700);
        await sleep(450);
      }
      const links = page.locator('aside a[href^="#"], nav a[href^="#"]');
      const c = await links.count();
      const target = links.nth(Math.min(3, c - 1));
      if (c) {
        const b = await target.boundingBox();
        if (b) {
          await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 15 });
          await sleep(300);
          await target.click();
        }
      }
      await sleep(1600);
    },
  },
  // 点击导航：花瓣迸发 + 指示条滑动 + 页面视图过渡
  pages: {
    async setup(page, base) {
      await ready(page, base + '/');
    },
    async run(page, base, sleep) {
      const clickNav = async (text) => {
        const b = await page
          .locator('nav a, nav button', { hasText: text })
          .first()
          .boundingBox({ timeout: 3000 })
          .catch(() => null);
        if (!b) return;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
        await sleep(250);
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      };
      const clickMenu = async (parent, text) => {
        await hoverText(page, parent, sleep, 650);
        const cands = page.locator('a:visible', { hasText: text });
        let b = null;
        for (let i = 0; i < (await cands.count()); i++) {
          const bb = await cands.nth(i).boundingBox();
          if (bb && bb.y < 200) {
            b = bb;
            break;
          }
        }
        if (!b) return;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
        await sleep(250);
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      };
      await sleep(600);
      await clickMenu('文章', '归档');
      await sleep(2200);
      await clickMenu('文章', '分类');
      await sleep(1800);
      await clickNav('友链');
      await sleep(1800);
      await clickNav('周刊');
      await sleep(2000);
    },
  },
  // 写作室：边写边预览
  editor: {
    viewport: { width: 1100, height: 720 },
    encode: { quality: 70 },
    async setup(page, base) {
      await ready(page, base + '/editor');
    },
    async run(page, base, sleep) {
      const cm = page.locator('.cm-content').first();
      await cm.click();
      await page.keyboard.press('Meta+End');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await sleep(300);
      const type = (t) => page.keyboard.type(t, { delay: 45 });
      await type('## 春日散步');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await type('风吹过路边的花，**今天也想记下一点小事**。');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await type('- 河边的樱花开到七八分');
      await page.keyboard.press('Enter');
      await type('买了一瓶柠檬汽水');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await type('明天也想出去走走。');
      await sleep(1500);
    },
  },
  // 移动端：抽屉菜单与拖拽关闭
  mobile: {
    viewport: { width: 390, height: 844, scale: 2, mobile: true },
    encode: { outWidth: 360, quality: 66 },
    async setup(page, base) {
      await ready(page, base + '/');
      await page.mouse.wheel(0, 0);
    },
    async run(page, base, sleep) {
      await sleep(600);
      await page.locator('[aria-label="打开菜单"]').first().click();
      await sleep(1500);
      const nav = page.locator('a', { hasText: '归档' }).first();
      if (await nav.isVisible().catch(() => false)) {
        await nav.hover();
      }
      await sleep(500);
      const cdp = await page.context().newCDPSession(page);
      const touch = (type, x, y) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await touch('touchStart', 250, 130);
      for (let i = 1; i <= 18; i++) {
        await touch('touchMove', 250 - i * 9, 130);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(250);
      for (let i = 1; i <= 10; i++) {
        await touch('touchMove', 88 - i * 14, 130);
        await page.waitForTimeout(16);
      }
      await touch('touchEnd', 0, 0);
      await sleep(1100);
    },
  },
};
