import { expect, test } from '@playwright/test';

for (const preference of ['system', 'site']) {
  test(`${preference} reduced motion preserves immediate positioning and authored completion events`, async ({ page }) => {
    if (preference === 'system') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    if (preference === 'site') {
      await page.evaluate(() => document.documentElement.classList.add('motion-off'));
    }
    const layout = await page.evaluate(() => {
      const plain = document.createElement('div');
      plain.style.cssText = 'position:absolute;top:0;left:0;width:20px;height:20px';
      const authored = plain.cloneNode() as HTMLDivElement;
      authored.className = 'transition-opacity duration-200';
      authored.style.opacity = '0';
      authored.addEventListener('transitionend', () => {
        authored.dataset.completed = 'true';
      });
      authored.id = 'authored-transition';
      document.body.append(plain, authored);
      plain.getBoundingClientRect();
      authored.getBoundingClientRect();
      plain.style.top = '140px';
      plain.style.left = '120px';
      authored.style.opacity = '1';
      const style = getComputedStyle(plain);
      return {
        top: style.top,
        left: style.left,
        transitions: plain.getAnimations().filter((animation) => animation instanceof CSSTransition).length,
      };
    });
    expect(layout).toEqual({ top: '140px', left: '120px', transitions: 0 });
    await expect(page.locator('#authored-transition')).toHaveAttribute('data-completed', 'true');
    await expect(page.locator('#authored-transition')).toHaveCSS('opacity', '1');
  });
}
