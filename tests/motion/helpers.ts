import type { Locator, Page } from '@playwright/test';

export async function activateToolbarButton(page: Page, button: Locator) {
  if ((page.viewportSize()?.width ?? 1440) <= 992) {
    await button.tap();
  } else {
    await button.click();
  }
}

export async function waitForToolbar(page: Page) {
  await page.waitForFunction(() => {
    const island = document.querySelector('astro-island[component-url*="FloatingGroup"]');
    return island && !island.hasAttribute('ssr');
  });
  const toggle = page.getByRole('button', { name: '展开/收起工具栏', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') {
    await activateToolbarButton(page, toggle);
    await page.mouse.move(0, 0);
  }
}

export async function gotoReady(page: Page, pathname = '/') {
  await page.goto(pathname, { waitUntil: 'domcontentloaded' });
  await waitForToolbar(page);
}
