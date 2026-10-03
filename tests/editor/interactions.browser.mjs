// Uses an existing server and isolated browser drafts; never writes blog files or starts servers.
// EDITOR_TEST_URL=http://localhost:4321 EDITOR_TEST_BROWSER=webkit node tests/editor/interactions.browser.mjs
import assert from 'node:assert/strict';
import { chromium, expect, webkit } from '@playwright/test';

const origin = new URL(process.env.EDITOR_TEST_URL ?? 'http://localhost:4321');
const browserName = process.env.EDITOR_TEST_BROWSER ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const browser = await { chromium, webkit }[browserName].launch();
const failures = [];

function documentSource(title, newline) {
  return `\uFEFF---\ntitle: ${title} # original comment\ntags: [ old ]\ncustom: null\n---\n\nBODY`.replaceAll('\n', newline);
}

async function runCase(mobile, newline, name, test) {
  const label = `${browserName}/${mobile ? 'mobile tap' : 'desktop click'}/${newline === '\r\n' ? 'CRLF' : 'LF'}/${name}`;
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1140, height: 815 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const errors = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL('/editor', origin).href, { waitUntil: 'domcontentloaded' });
    const input = page.locator('.cm-content');
    await input.waitFor();
    const activate = async (locator) => {
      if (mobile) await locator.tap();
      else await locator.click();
    };
    const button = (name) => page.getByRole('button', { name, exact: true });
    const exported = async () => {
      await page.evaluate(() => {
        window.interactionsCopiedSource = null;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text) => {
              window.interactionsCopiedSource = text;
            },
          },
        });
      });
      await activate(button('复制'));
      await expect.poll(() => page.evaluate(() => window.interactionsCopiedSource)).not.toBeNull();
      return page.evaluate(() => window.interactionsCopiedSource);
    };
    const load = async (title) => {
      const source = documentSource(title, newline);
      await page.locator('input[type=file]').setInputFiles({
        name: `${title}.md`,
        mimeType: 'text/markdown',
        buffer: Buffer.from(source),
      });
      await expect(page.locator('.editor-document-name')).toContainText(title);
      await expect(input).toContainText('BODY');
      assert.equal(await exported(), source, 'import preserves the complete source, BOM and line endings');
      return source;
    };
    const openProperties = () => activate(button(mobile ? '属性' : '文章属性'));
    const selectBody = async () => {
      await activate(input);
      await input.press('ControlOrMeta+End');
      await input.press('Shift+Home');
      assert.equal(await page.evaluate(() => window.getSelection().toString()), 'BODY');
    };
    const append = async (text) => {
      await activate(input);
      await input.press('ControlOrMeta+End');
      await input.pressSequentially(text);
    };
    const openDraft = async (title) => {
      await activate(button('草稿'));
      await activate(page.locator('.editor-draft-row > button:first-child').filter({ hasText: title }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.editor-document-name')).toContainText(title);
    };
    await test({ page, input, activate, button, exported, load, openProperties, selectBody, append, openDraft });
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log(`PASS ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ label, message });
    console.error(`FAIL ${label}\n${message}`);
  } finally {
    await context.close();
  }
}

try {
  for (const mobile of [false, true]) {
    for (const newline of ['\n', '\r\n']) {
      await runCase(
        mobile,
        newline,
        'metadata preserves the selected body',
        async ({ page, activate, button, exported, load, openProperties, selectBody }) => {
          const source = await load('Selected-body');
          await selectBody();
          await openProperties();
          await page.getByRole('textbox', { name: '标题', exact: true }).fill('Renamed');
          await activate(button('关闭面板'));
          await activate(button('粗体'));
          assert.equal(await exported(), source.replace('title: Selected-body', 'title: Renamed').replace('BODY', '**BODY**'));
        },
      );

      await runCase(mobile, newline, 'Escape commits pending tag input', async ({ page, exported, load, openProperties }) => {
        const source = await load('Pending-tags');
        await openProperties();
        const tags = page.getByRole('textbox', { name: '标签（以逗号分隔）', exact: true });
        await tags.fill('old,new');
        await tags.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        assert.equal(await exported(), source.replace('tags: [ old ]', ['tags:', '  - old', '  - new'].join(newline)));
      });

      await runCase(
        mobile,
        newline,
        'switching drafts preserves isolated undo and redo',
        async ({ input, activate, button, exported, load, append, openDraft }) => {
          const sourceA = await load('History-A');
          await append('X');
          assert.equal(await exported(), `${sourceA}X`);
          const sourceB = await load('History-B');
          await append('Y');
          assert.equal(await exported(), `${sourceB}Y`);
          await openDraft('History-A');
          await activate(button('撤销'));
          await expect(input).toBeFocused();
          assert.equal(await exported(), sourceA, 'draft A retains its own undo history after switching away');
          await activate(button('重做'));
          await expect(input).toBeFocused();
          assert.equal(await exported(), `${sourceA}X`);
          await openDraft('History-B');
          assert.equal(await exported(), `${sourceB}Y`, 'undoing A does not mutate draft B');
          await activate(button('撤销'));
          await expect(input).toBeFocused();
          assert.equal(await exported(), sourceB);
          await activate(button('重做'));
          await expect(input).toBeFocused();
          assert.equal(await exported(), `${sourceB}Y`);
          await openDraft('History-A');
          assert.equal(await exported(), `${sourceA}X`, 'undoing B does not mutate draft A');
        },
      );

      await runCase(
        mobile,
        newline,
        'syntax insertion protects selected frontmatter',
        async ({ page, input, activate, button, exported, load }) => {
          const source = await load('Protected-frontmatter');
          await activate(input);
          await input.press('ControlOrMeta+Home');
          await input.press('Shift+End');
          assert.ok((await page.evaluate(() => window.getSelection().toString())).includes('---'));
          await activate(button(mobile ? '语法' : '语法手册'));
          await page.getByRole('searchbox').fill('提醒块');
          await activate(page.locator('.editor-syntax-toggle').filter({ hasText: '提醒块' }));
          await activate(button('插入模板'));
          await expect(input).toBeFocused();
          await expect(page.getByRole('alert')).toContainText('所有选区放在正文');
          assert.equal(await exported(), source, 'a frontmatter selection rejects the template without changing any source');

          await activate(input);
          await input.press('ControlOrMeta+End');
          await activate(button(mobile ? '语法' : '语法手册'));
          await page.getByRole('searchbox').fill('提醒块');
          await activate(page.locator('.editor-syntax-toggle').filter({ hasText: '提醒块' }));
          const template = await page.locator('.editor-syntax-source code').innerText();
          await activate(button('插入模板'));
          await expect(input).toBeFocused();
          await expect(page.getByRole('alert')).toHaveCount(0);
          const result = await exported();
          const closing = `${newline}---${newline}`;
          const header = source.slice(0, source.indexOf(closing) + closing.length);
          assert.equal(result.slice(0, header.length), header, 'the exact original YAML remains intact');
          assert.ok(result.includes(':::info'), 'the requested template was inserted into the body');
          assert.equal(
            result,
            `${source}${newline}${template.replace(/\r?\n/g, newline)}${template.endsWith('\n') ? '' : newline}`,
            'a valid body cursor appends the template while preserving the complete original source',
          );
          if (newline === '\r\n') assert.ok(!/(?<!\r)\n/.test(result), 'the inserted template retains CRLF');
        },
      );
    }
  }
  assert.equal(failures.length, 0, `${failures.length} interaction regression(s) failed; see FAIL entries above`);
} finally {
  await browser.close();
}
