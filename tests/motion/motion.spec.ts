import { expect, type Page, test } from '@playwright/test';
import { activateToolbarButton, gotoReady, waitForToolbar } from './helpers';

async function openMotionSetting(page: Page) {
  await activateToolbarButton(page, page.locator('[data-settings-toggle]'));
  await page.getByRole('button', { name: '通用', exact: true }).click();
  const reduced = page.getByRole('button', { name: '减弱', exact: true });
  await expect(reduced).toBeVisible();
  return {
    lively: page.getByRole('button', { name: '灵动', exact: true }),
    subtle: page.getByRole('button', { name: '克制', exact: true }),
    reduced,
  };
}

async function motionState(page: Page) {
  return page.evaluate(async () => {
    const url = '/src/lib/motion-level.ts';
    const motion = await import(/* @vite-ignore */ url);
    return { disabled: motion.isMotionDisabled(), scroll: motion.getScrollBehavior() };
  });
}

test('system reduce applies on first load and suppresses CSS motion without hiding content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.dataset.motionAtDomReady = String(document.documentElement.classList.contains('motion-off'));
    });
  });
  await gotoReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion-at-dom-ready', 'true');
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });
  expect(await page.evaluate(() => localStorage.getItem('site-motion-level'))).toBeNull();

  const styles = await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'motion-css-fixture';
    fixture.className = 'transition-transform duration-300 animate-ping';
    fixture.innerHTML =
      '<span class="motion-rise">Reduced motion keeps this content visible</span><span data-reveal="pending">Pending reveal remains readable</span>';
    document.body.append(fixture);
    const computed = getComputedStyle(fixture);
    return {
      animation: computed.animationName,
      transition: computed.transitionDuration,
      opacity: computed.opacity,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  expect(styles.animation).toBe('none');
  expect(styles.transition.split(',').every((value) => Number.parseFloat(value) <= 0.001)).toBe(true);
  expect(styles.opacity).toBe('1');
  expect(styles.scroll).toBe('auto');
  await expect(page.locator('#motion-css-fixture')).toBeVisible();
  await expect(page.locator('#motion-css-fixture .motion-rise')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#motion-css-fixture [data-reveal]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-settings-toggle]')).toBeVisible();
});

test('runtime system changes notify subscribers and never override an explicit site preference', async ({ page }) => {
  await gotoReady(page);
  await page.evaluate(async () => {
    const url = '/src/lib/motion-level.ts';
    const motion = await import(/* @vite-ignore */ url);
    motion.subscribeMotionLevel(() => {
      document.documentElement.dataset.motionNotification = String(motion.isMotionDisabled());
    });
  });
  expect(await motionState(page)).toEqual({ disabled: false, scroll: 'smooth' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion-notification', 'true');
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-motion-notification', 'false');
  await expect(page.locator('html')).not.toHaveClass(/motion-off/);

  const setting = await openMotionSetting(page);
  await setting.reduced.click();
  await expect(setting.reduced).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setting.lively.click();
  await expect(setting.lively).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('系统已开启「减少动态效果」，将始终按「减弱」处理', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });
});

test('site motion setting survives reload and real client navigation, then restores motion', async ({ page }) => {
  await gotoReady(page);
  const setting = await openMotionSetting(page);
  await setting.reduced.click();
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  expect(await page.evaluate(() => localStorage.getItem('site-motion-level'))).toBe('reduced');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });

  // A marker distinguishes an Astro navigation from a new document load.
  await page.evaluate(() => {
    Object.assign(window, { motionNavigationMarker: true });
  });
  await page.locator('main a[href^="/post/"]').first().click();
  await expect(page).toHaveURL(/\/post\//);
  expect(await page.evaluate(() => Reflect.get(window, 'motionNavigationMarker'))).toBe(true);
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  await waitForToolbar(page);
  const restoredSetting = await openMotionSetting(page);
  await expect(restoredSetting.reduced).toHaveAttribute('aria-pressed', 'true');
  await restoredSetting.lively.click();
  await expect(page.locator('html')).not.toHaveClass(/motion-off/);
  expect(await motionState(page)).toEqual({ disabled: false, scroll: 'smooth' });
});

test('subtle motion preserves its chosen level while system reduce caps its effective behavior', async ({ page }) => {
  await gotoReady(page);
  const setting = await openMotionSetting(page);
  await setting.subtle.click();
  await expect(setting.subtle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'subtle');
  expect(await motionState(page)).toEqual({ disabled: false, scroll: 'smooth' });
  expect(await page.evaluate(() => localStorage.getItem('site-motion-level'))).toBe('subtle');
  expect(await page.locator('html').evaluate((root) => getComputedStyle(root).getPropertyValue('--motion-travel').trim())).toBe(
    '0.5',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'subtle');
  await expect(setting.subtle).toHaveAttribute('aria-pressed', 'true');
  expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });
  await page.getByRole('button', { name: '关闭设置面板', exact: true }).click();
  await page.evaluate(() => {
    Object.assign(window, { motionNavigationMarker: true });
  });
  await page.locator('main a[href^="/post/"]').first().click();
  await expect(page).toHaveURL(/\/post\//);
  expect(await page.evaluate(() => Reflect.get(window, 'motionNavigationMarker'))).toBe(true);
  await expect(page.locator('html')).toHaveClass(/motion-off/);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'subtle');
  expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).not.toHaveClass(/motion-off/);
  expect(await motionState(page)).toEqual({ disabled: false, scroll: 'smooth' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'subtle');
});

for (const key of ['site-motion-level', 'site-master-motion']) {
  test(`saved ${key} preference is effective before idle islands hydrate`, async ({ page }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(storageKey, storageKey === 'site-motion-level' ? 'reduced' : 'true');
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.dataset.motionAtDomReady = String(document.documentElement.classList.contains('motion-off'));
      });
    }, key);
    await gotoReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-motion-at-dom-ready', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    expect(await motionState(page)).toEqual({ disabled: true, scroll: 'instant' });
  });
}

test('reduced motion search modal and mobile drawer stay visible and dismiss normally', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  if (isMobile) {
    const menu = page.getByRole('button', { name: '打开菜单', exact: true });
    await expect(menu).toBeVisible();
    await page.waitForFunction(() => !document.querySelector('#mobile-menu-container astro-island')?.hasAttribute('ssr'));
    await menu.click();
    await expect(page.locator('#drawer-overlay')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await expect(page.locator('#mobile-drawer')).toBeInViewport();
    expect(
      Number.parseFloat(
        await page.locator('#mobile-drawer').evaluate((element) => getComputedStyle(element).transitionDuration),
      ),
    ).toBeLessThanOrEqual(0.001);
    await page.locator('#close-drawer').click();
    await expect(page.locator('#drawer-overlay')).toBeHidden();
    await menu.click();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Escape');
    await expect(page.locator('#drawer-overlay')).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  }
  const search = page.locator('button[aria-label="搜索"][title]:visible').first();
  await expect(search).toBeVisible();
  await search.click();
  await expect(page.locator('.search-dialog')).toBeVisible();
  const dialog = page.getByRole('dialog', { name: '搜索文章', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.pf-searchbox-input')).toBeVisible();
  await expect(dialog.locator('.pf-searchbox-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.search-dialog')).toBeHidden();
  await search.click();
  await page.locator('.search-dialog').getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.locator('.search-dialog')).toBeHidden();
});

test('real scroll buttons use instant scrolling under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  await page.evaluate(() => {
    const scrollTo = window.scrollTo.bind(window);
    window.scrollTo = ((options: ScrollToOptions) => {
      document.documentElement.dataset.scrollBehaviorRequested = options.behavior;
      scrollTo(options);
    }) as typeof window.scrollTo;
  });
  await activateToolbarButton(page, page.getByRole('button', { name: '滚到底部', exact: true }));
  await expect(page.locator('html')).toHaveAttribute('data-scroll-behavior-requested', 'instant');
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await activateToolbarButton(page, page.getByRole('button', { name: '回到顶部', exact: true }));
  await expect(page.locator('html')).toHaveAttribute('data-scroll-behavior-requested', 'instant');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('404 presents a stable visible shape without running decoration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page, '/404');
  await expect(page.locator('.cat-404')).toBeVisible();
  await expect(page.locator('[data-nf-link="home"]')).toBeVisible();
  const state = await page.locator('.cat-404-container').evaluate((container) => {
    const outline = container.querySelector('.digit-0-outline');
    const features = container.querySelector('.face-features');
    if (!outline || !features) throw new Error('404 shape elements are missing');
    return {
      animations: container.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
      shape: getComputedStyle(outline).rx,
      features: getComputedStyle(features).opacity,
    };
  });
  expect(state.animations).toBe(0);
  expect(state.features).toBe('0');
  expect(state.shape).toBe('35px');
  await page.waitForTimeout(200);
  expect(await page.locator('.digit-0-outline').evaluate((element) => getComputedStyle(element).rx)).toBe(state.shape);
});

test('reduced-motion spoiler fallback supports pointer and keyboard without loading a canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  const canvasCount = await page.locator('canvas').count();
  await page.evaluate(async () => {
    const fixture = document.createElement('div');
    fixture.id = 'motion-spoiler-fixture';
    fixture.className = 'prose';
    fixture.style.paddingTop = '100px';
    fixture.dataset.spoilerRevealLabel = '显示隐藏内容';
    fixture.innerHTML =
      '<spoiler-span id="pointer-spoiler">Pointer secret</spoiler-span> <spoiler-span id="keyboard-spoiler">Keyboard secret</spoiler-span>';
    document.body.prepend(fixture);
    const url = '/src/lib/spoiler-enhancer.ts';
    const spoiler = await import(/* @vite-ignore */ url);
    spoiler.enhanceSpoilers(fixture);
  });
  const pointer = page.locator('#pointer-spoiler');
  const keyboard = page.locator('#keyboard-spoiler');
  await expect(pointer).toHaveAttribute('data-static-spoiler', '');
  await expect(pointer).toHaveAttribute('role', 'button');
  await expect(pointer).toHaveAttribute('aria-label', '显示隐藏内容');
  expect(await pointer.evaluate((element) => getComputedStyle(element).color)).toBe('rgba(0, 0, 0, 0)');
  await pointer.click();
  await expect(pointer).toHaveAttribute('data-fallback-revealed', 'true');
  await keyboard.focus();
  await keyboard.press('Space');
  await expect(keyboard).toHaveAttribute('data-fallback-revealed', 'true');
  expect(await pointer.evaluate((element) => getComputedStyle(element).color)).not.toBe('rgba(0, 0, 0, 0)');
  await expect(pointer).toBeVisible();
  expect(await page.locator('canvas').count()).toBe(canvasCount);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(pointer).toHaveAttribute('data-fallback-revealed', 'true');
  await expect(keyboard).toHaveAttribute('data-fallback-revealed', 'true');
});

test('reduced-motion lightbox navigation, zoom and rotation work without bouncing arrows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island[component-url*="ImageLightbox"]');
    return island && !island.hasAttribute('ssr');
  });
  await page.evaluate(async () => {
    const fixture = document.createElement('div');
    fixture.className = 'custom-content';
    fixture.id = 'motion-lightbox-fixture';
    fixture.style.paddingTop = '100px';
    for (const [index, color] of ['tomato', 'teal'].entries()) {
      const wrapper = document.createElement('div');
      wrapper.className = 'markdown-image-wrapper';
      const image = document.createElement('img');
      image.className = 'markdown-image';
      image.alt = `Motion image ${index + 1}`;
      image.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="${color}"/></svg>`)}`;
      wrapper.append(image);
      fixture.append(wrapper);
    }
    document.body.prepend(fixture);
    const url = '/src/lib/image-enhancer.ts';
    const images = await import(/* @vite-ignore */ url);
    images.enhanceImages(fixture);
  });
  await expect(page.locator('#motion-lightbox-fixture .markdown-image.loaded')).toHaveCount(2);
  await page.locator('#motion-lightbox-fixture img').first().click();
  const dialog = page.getByRole('dialog').filter({ has: page.locator('img[alt^="Motion image"]') });
  await expect(dialog).toBeVisible();
  const image = dialog.locator('img');
  await expect(image).toHaveAttribute('alt', 'Motion image 1');
  await expect(image).toHaveCSS('opacity', '1');
  const arrow = dialog.getByRole('button', { name: '下一张', exact: true }).locator('svg').first();
  expect(await arrow.evaluate((element) => element.getAnimations().length)).toBe(0);
  await page.waitForTimeout(200);
  expect(await arrow.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  await dialog.getByRole('button', { name: '下一张', exact: true }).click();
  await expect(image).toHaveAttribute('alt', 'Motion image 2');
  await dialog.getByRole('button', { name: '放大', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '重置缩放和旋转', exact: true })).toHaveText('150%');
  await expect(image).toHaveCSS('transform', 'matrix(1.5, 0, 0, 1.5, 0, 0)');
  await dialog.getByRole('button', { name: '旋转 90°', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '重置缩放和旋转', exact: true })).toHaveText('100%');
  await expect(image).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
  await dialog.getByRole('button', { name: '重置缩放和旋转', exact: true }).click();
  await expect(image).toHaveCSS('transform', 'none');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('collapsible Moments spoilers preserve hidden focus guards through motion changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  await page.evaluate(async () => {
    const bodyScript = '/src/components/moments/MessageBody.astro?astro&type=script&index=0&lang.ts';
    const cardScript = '/src/components/moments/MessageCard.astro?astro&type=script&index=0&lang.ts';
    await import(/* @vite-ignore */ bodyScript);
    await import(/* @vite-ignore */ cardScript);
    const card = document.createElement('article');
    card.id = 'motion-moments-fixture';
    card.className = 'moments-message-card';
    card.dataset.messageHref = '/this-fixture-must-not-navigate';
    // Inline sizing isolates the focus lifecycle from the disabled Moments route's scoped stylesheet.
    const style = document.createElement('style');
    style.textContent =
      '#motion-moments-fixture [data-expanded="false"] [data-message-content] { max-height: 384px; overflow: hidden; }';
    card.append(style);
    const body = document.createElement('moments-message-body');
    body.dataset.collapsibleRequested = 'true';
    body.dataset.expandLabel = 'Expand regression content';
    body.dataset.collapseLabel = 'Collapse regression content';
    body.innerHTML =
      '<div data-message-content data-spoiler-reveal-label="显示隐藏内容"><p style="height:500px">Long content before spoiler</p><spoiler-span id="collapsed-spoiler">Hidden regression secret</spoiler-span></div><button hidden data-message-toggle><span data-message-toggle-label></span></button>';
    card.append(body);
    document.body.prepend(card);
    document.dispatchEvent(new CustomEvent('moments:content-appended', { detail: { root: card } }));
  });
  const spoiler = page.locator('#collapsed-spoiler');
  await expect(page.locator('#motion-moments-fixture moments-message-body')).toHaveAttribute('data-expanded', 'false');
  await expect(spoiler).toHaveAttribute('inert', '');
  await expect(spoiler).toHaveAttribute('tabindex', '-1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(spoiler).not.toHaveAttribute('data-static-spoiler');
  await expect(spoiler).toHaveAttribute('inert', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(spoiler).toHaveAttribute('data-static-spoiler', '');
  await expect(spoiler).toHaveAttribute('inert', '');
  await expect(spoiler).toHaveAttribute('tabindex', '-1');
  await page.getByRole('button', { name: 'Expand regression content', exact: true }).click();
  await expect(spoiler).not.toHaveAttribute('inert');
  await expect(spoiler).toHaveAttribute('tabindex', '0');
  await spoiler.focus();
  await spoiler.press('Enter');
  await expect(spoiler).toHaveAttribute('data-fallback-revealed', 'true');
  await spoiler.click();
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(/:\d+\/$/);
  await page.getByRole('button', { name: 'Collapse regression content', exact: true }).click();
  await expect(spoiler).not.toHaveAttribute('inert');
  await expect(spoiler).not.toHaveAttribute('tabindex');
  await page.getByRole('button', { name: 'Expand regression content', exact: true }).click();
  await expect(spoiler).not.toHaveAttribute('inert');
  await expect(spoiler).not.toHaveAttribute('tabindex');
});

test('static spoilers preserve rich child nodes and their focus guards across mode changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  await page.evaluate(async () => {
    const fixture = document.createElement('div');
    fixture.id = 'rich-spoiler-fixture';
    fixture.className = 'prose';
    fixture.style.cssText = 'position:fixed;top:100px;left:20px;z-index:9999';
    fixture.dataset.spoilerRevealLabel = '显示隐藏内容';
    fixture.innerHTML =
      '<spoiler-span id="rich-spoiler"><strong>Rich secret</strong> <button id="rich-spoiler-child" tabindex="3">Preserved control</button></spoiler-span>';
    const child = fixture.querySelector<HTMLButtonElement>('#rich-spoiler-child');
    if (!child) throw new Error('Missing rich spoiler child');
    child.addEventListener('click', () => {
      child.dataset.clicks = String(Number(child.dataset.clicks ?? 0) + 1);
    });
    Object.assign(window, { originalSpoilerChild: child });
    document.body.prepend(fixture);
    const url = '/src/lib/spoiler-enhancer.ts';
    const { enhanceSpoilers } = await import(/* @vite-ignore */ url);
    enhanceSpoilers(fixture);
  });
  const spoiler = page.locator('#rich-spoiler');
  const child = page.locator('#rich-spoiler-child');
  await expect(spoiler).toHaveAttribute('data-static-spoiler', '');
  await expect(spoiler.locator('strong')).toHaveText('Rich secret');
  await expect(child).toBeHidden();
  await spoiler.focus();
  await child.evaluate((node: HTMLElement) => node.focus());
  await expect(spoiler).toBeFocused();
  expect(await child.evaluate((node) => node === Reflect.get(window, 'originalSpoilerChild'))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(spoiler).not.toHaveAttribute('data-static-spoiler');
  await expect(spoiler.getByRole('button', { name: '显示隐藏内容', exact: true })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(spoiler).toHaveAttribute('data-static-spoiler', '');
  await expect(spoiler).toBeFocused();
  await expect(child).toBeHidden();
  await spoiler.focus();
  await child.evaluate((node: HTMLElement) => node.focus());
  await expect(spoiler).toBeFocused();
  await spoiler.press('Enter');
  await expect(spoiler).toHaveAttribute('data-fallback-revealed', 'true');
  await expect(child).toBeVisible();
  await expect(child).toHaveAttribute('tabindex', '3');
  expect(await child.evaluate((node) => node === Reflect.get(window, 'originalSpoilerChild'))).toBe(true);
  await child.click();
  await expect(child).toHaveAttribute('data-clicks', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(child).toHaveAttribute('tabindex', '3');
  await expect(spoiler).toHaveAttribute('data-fallback-revealed', 'true');
});

for (const preference of ['system', 'site']) {
  test(`${preference} reduce preserves focus on a revealed rich spoiler child`, async ({ page }) => {
    await gotoReady(page);
    await page.evaluate(async () => {
      const fixture = document.createElement('div');
      fixture.id = 'focused-rich-spoiler-fixture';
      fixture.className = 'prose';
      fixture.style.cssText = 'position:fixed;top:150px;left:20px;z-index:9999';
      fixture.dataset.spoilerRevealLabel = '显示隐藏内容';
      fixture.innerHTML =
        '<spoiler-span id="focused-rich-spoiler">Secret <button id="focused-rich-child">Focused preserved child</button></spoiler-span>';
      const child = fixture.querySelector<HTMLButtonElement>('#focused-rich-child');
      if (!child) throw new Error('Missing focused spoiler child');
      child.addEventListener('click', () => {
        child.dataset.clicked = 'true';
      });
      Object.assign(window, { focusedSpoilerChild: child });
      document.body.prepend(fixture);
      const url = '/src/lib/spoiler-enhancer.ts';
      const { enhanceSpoilers } = await import(/* @vite-ignore */ url);
      enhanceSpoilers(fixture);
    });
    const spoiler = page.locator('#focused-rich-spoiler');
    const child = page.locator('#focused-rich-child');
    const reveal = spoiler.getByRole('button', { name: '显示隐藏内容', exact: true });
    await expect(reveal).toBeVisible();
    await reveal.click();
    await expect
      .poll(() => spoiler.evaluate((host) => Boolean(host.shadowRoot?.querySelector('.revealed, .revealing'))))
      .toBe(true);
    await child.focus();
    await expect(child).toBeFocused();
    if (preference === 'system') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } else {
      await page.evaluate(async () => {
        const url = '/src/store/settings.ts';
        const { setMotionLevel } = await import(/* @vite-ignore */ url);
        setMotionLevel('reduced');
      });
    }
    await expect(spoiler).toHaveAttribute('data-static-spoiler', '');
    await expect(spoiler).toHaveAttribute('data-fallback-revealed', 'true');
    await expect(child).toBeFocused();
    expect(await child.evaluate((node) => node === Reflect.get(window, 'focusedSpoilerChild'))).toBe(true);
    await child.click();
    await expect(child).toHaveAttribute('data-clicked', 'true');
  });
}

test('switching to reduced motion before a new spoiler renders cannot leak a canvas or window listeners', async ({ page }) => {
  await gotoReady(page);
  const before = await page.locator('canvas').count();
  await page.evaluate(async () => {
    const url = '/src/lib/spoiler-enhancer.ts';
    const settingsUrl = '/src/store/settings.ts';
    const spoiler = await import(/* @vite-ignore */ url);
    const settings = await import(/* @vite-ignore */ settingsUrl);
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>([
      ['scroll', new Set()],
      ['resize', new Set()],
    ]);
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (listener) listeners.get(type)?.add(listener);
      add(type, listener, options);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      if (listener) listeners.get(type)?.delete(listener);
      remove(type, listener, options);
    }) as typeof window.removeEventListener;
    Object.assign(window, {
      getSpoilerListenerCount: () => [...listeners.values()].reduce((total, handlers) => total + handlers.size, 0),
    });
    const warmup = document.createElement('spoiler-span');
    warmup.id = 'first-registration-spoiler';
    warmup.textContent = 'Register spoiler component';
    document.body.prepend(warmup);
    spoiler.enhanceSpoilers(document);
    await Promise.race([
      customElements.whenDefined('spoiler-span'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('spoiler custom element failed to register')), 5000)),
    ]);
    settings.setMotionLevel('reduced');
    document.getElementById('first-registration-spoiler')?.remove();
  });
  // Give queued componentDidLoad and a possible RAF leak enough time to run.
  await page.waitForTimeout(250);
  expect(await page.locator('canvas').count()).toBe(before);
  expect(await page.evaluate(() => Reflect.get(window, 'getSpoilerListenerCount')())).toBe(0);

  await page.evaluate(async () => {
    const settingsUrl = '/src/store/settings.ts';
    const settings = await import(/* @vite-ignore */ settingsUrl);
    settings.setMotionLevel('lively');
    const fresh = document.createElement('spoiler-span');
    fresh.id = 'pre-render-spoiler';
    fresh.textContent = 'Must stay static after an immediate reduce change';
    document.body.prepend(fresh);
    settings.setMotionLevel('reduced');
  });
  await expect(page.locator('#pre-render-spoiler')).toHaveAttribute('data-static-spoiler', '');
  await page.waitForTimeout(250);
  expect(await page.locator('canvas').count()).toBe(before);
  expect(await page.evaluate(() => Reflect.get(window, 'getSpoilerListenerCount')())).toBe(0);
});

test('reduced motion remains operable with simulated slow CPU', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoReady(page);
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    const setting = await openMotionSetting(page);
    await setting.reduced.click();
    await expect(setting.reduced).toHaveAttribute('aria-pressed', 'true');
    await setting.lively.click();
    await expect(setting.lively).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveClass(/motion-off/);
    await page.getByRole('button', { name: '关闭设置面板', exact: true }).click();
    const search = page.locator('button[aria-label="搜索"][title]:visible').first();
    await search.click();
    await expect(page.locator('.search-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.search-dialog')).toBeHidden();
  } finally {
    if (!page.isClosed()) {
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await session.detach();
    }
  }
});
