import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createHighlighter } from 'shiki';
import { decryptContent } from '../../lib/crypto/decrypt';
import { shokaMetaTransformer } from '../../lib/markdown/shiki-meta-transformer';
import { encryptEditorContent, encryptEditorPost } from './crypto';
import { renderEditorMarkdown } from './render';

test('real Shoka inline effects, containers and annotated quiz lists retain the blog markup', async () => {
  const markdown = [
    '## Shoka 示例',
    '',
    ':::info',
    '++插入++ ==高亮== H~2~O x^2^ {汉字^hanzi} !!秘密!!',
    ':::',
    '',
    '+++warning 展开内容',
    '**加粗**',
    '+++',
    '',
    ';;;platform 手机',
    '移动内容',
    ';;;',
    ';;;platform 桌面',
    '桌面内容',
    ';;;',
    '',
    '- 选择题{.quiz}',
    '  - 正确答案{.correct}',
    '  - 错误答案',
  ].join('\n');
  const { html, headings } = await renderEditorMarkdown(markdown);
  assert.match(html, /class="note-block note-info"/);
  assert.match(html, /<ins>插入<\/ins>/);
  assert.match(html, /<mark>高亮<\/mark>/);
  assert.match(html, /H<sub>2<\/sub>O/);
  assert.match(html, /x<sup>2<\/sup>/);
  assert.match(html, /<ruby>汉字<rp>\(<\/rp><rt>hanzi<\/rt>/);
  assert.match(html, /<spoiler-span>秘密<\/spoiler-span>/);
  assert.match(html, /<details class="collapse-block collapse-warning">/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /class="tab-panel active"/);
  assert.match(html, /class="quiz"/);
  assert.match(html, /class="correct"/);
  assert.deepEqual(headings, [{ depth: 2, slug: 'shoka-示例', text: 'Shoka 示例' }]);
});

test('code fences protect literal syntax and preserve title, line marks and unknown languages', async () => {
  const { html } = await renderEditorMarkdown(
    [
      '```js title="hello.js" mark:1 command:("$":1)',
      'const example = "!!not a spoiler!!";',
      '```',
      '',
      '```custom-unknown-language',
      ':::info',
      '<script>literal</script>',
      '```',
    ].join('\n'),
  );
  assert.match(html, /data-title="hello.js"/);
  assert.match(html, /data-mark="1"/);
  assert.match(html, /data-prompt="\$"/);
  assert.match(html, /!!not a spoiler!!/);
  assert.doesNotMatch(html, /<spoiler-span>/);
  assert.match(html, /data-language="custom-unknown-language"/);
  assert.match(html, /&#x3C;script>/);
});

test('normal mark and command ranges keep their exact line behavior and metadata', async () => {
  const highlighter = await createHighlighter({ themes: ['github-light'], langs: [] });
  try {
    const transformer = shokaMetaTransformer();
    const html = highlighter.codeToHtml('one\ntwo\nthree\nfour\nfive\nsix\nseven', {
      lang: 'text',
      theme: 'github-light',
      meta: { __raw: 'title="valid.txt" mark:1,3-5,7 command:("$":1-3,"#":4-5)' },
      transformers: [transformer],
    });
    assert.match(html, /data-title="valid.txt"/);
    assert.match(html, /data-mark="1,3-5,7"/);
    assert.match(html, /data-command="&#x22;\$&#x22;:1-3,&#x22;#&#x22;:4-5"/);
    assert.deepEqual(
      [...html.matchAll(/<span class="([^"]+)"(?: data-prompt="([^"]+)")?>/g)].map((match) => [match[1], match[2]]),
      [
        ['line line-highlight has-prompt', '$'],
        ['line has-prompt', '$'],
        ['line line-highlight has-prompt', '$'],
        ['line line-highlight has-prompt', '#'],
        ['line line-highlight has-prompt', '#'],
        ['line', undefined],
        ['line line-highlight', undefined],
      ],
    );
    for (const lineCount of [1, 4, 2]) {
      const shared = highlighter.codeToHtml(Array.from({ length: lineCount }, () => 'line').join('\n'), {
        lang: 'text',
        theme: 'github-light',
        meta: { __raw: 'mark:1-4 command:("$":1-4)' },
        transformers: [transformer],
      });
      assert.equal(shared.match(/line-highlight/g)?.length, lineCount);
      assert.equal(shared.match(/data-prompt="\$"/g)?.length, lineCount);
    }
  } finally {
    highlighter.dispose();
  }
});

test('huge ranges, numeric overflow and generated metadata stay bounded by actual code lines', (t) => {
  // A separate process with a hard timeout keeps a regression from hanging the test runner.
  const script = String.raw`
    import assert from 'node:assert/strict';
    import { renderEditorMarkdown } from ${JSON.stringify(new URL('./render.ts', import.meta.url).href)};
    await renderEditorMarkdown('warmup');
    const started = performance.now();
    const fence = String.fromCharCode(96).repeat(3);
    const hugeNumber = '9'.repeat(500);
    const manyRanges = Array(20000).fill('1-1000000000').join(',');
    for (const ranges of ['1-1000000000', '1-' + hugeNumber, manyRanges]) {
      const { html } = await renderEditorMarkdown(fence + 'text mark:' + ranges + ' command:("$":1-' + hugeNumber + ',"#":' + hugeNumber + ')\none\ntwo\n' + fence);
      assert.equal(html.match(/line-highlight/g)?.length, 2);
      assert.equal(html.split('data-prompt="$"').length - 1, 2);
      assert.equal((html.match(/data-prompt="#"/g) ?? []).length, 0);
      assert.ok(html.includes('data-mark="' + ranges + '"'));
    }
    const outOfBounds = await renderEditorMarkdown(fence + 'text mark:' + hugeNumber + ',' + hugeNumber + '-' + hugeNumber + '\none\ntwo\n' + fence);
    assert.equal((outOfBounds.html.match(/line-highlight/g) ?? []).length, 0);
    const prompts = Array.from({ length: 2000 }, (_, index) => '"p' + index + '":1-1000000000').join(',');
    const commands = await renderEditorMarkdown(fence + 'text command:(' + prompts + ')\none\ntwo\n' + fence);
    assert.equal(commands.html.match(/data-prompt="p127"/g)?.length, 2);
    assert.equal((commands.html.match(/has-prompt/g) ?? []).length, 256);
    console.log('bounded range fixtures passed in ' + (performance.now() - started).toFixed(1) + ' ms');
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    timeout: 5000,
    encoding: 'utf8',
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /bounded range fixtures passed/);
  t.diagnostic(child.stdout.trim());
});

test('math uses KaTeX while normal and duplicate headings share the published anchor format', async () => {
  const { html, headings } = await renderEditorMarkdown('## 数学\n\n$x^2 + y^2$\n\n$$\n\\frac{1}{2}\n$$\n\n## 数学');
  assert.match(html, /class="katex"/);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
  assert.deepEqual(
    headings.map((heading) => heading.slug),
    ['数学', '数学-1'],
  );
});

test('hostile raw HTML and attribute syntax cannot introduce scripts, handlers or active URLs', async () => {
  const { html } = await renderEditorMarkdown(
    [
      '<script>window.parent.localStorage.clear()</script>',
      '',
      '<style>body{display:none}</style>',
      '',
      '<img src="https://example.com/image.jpg" onerror="alert(1)">',
      '',
      '<a href="java&#x73;cript:alert(1)" onclick="alert(1)">危险</a>',
      '',
      '++插入++{onclick=alert(1)}',
      '',
      '<div style="background:url(https://example.com/tracker)">文字</div>',
    ].join('\n'),
  );
  assert.doesNotMatch(html, /<script|<style|onerror=|onclick=|javascript:|background:url/i);
  assert.match(html, /文字/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /markdown-image-wrapper/);
});

test('GFM tasks preserve checked states while editable or other raw inputs are removed', async () => {
  const { html } = await renderEditorMarkdown(
    '- [x] 已完成\n- [ ] 未完成\n\n<input type="text" disabled value="删除">\n<input type="checkbox" checked>\n<input type="password" value="删除">',
  );
  const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map((match) => match[0]);
  assert.equal(inputs.length, 2);
  assert.match(inputs[0], /type="checkbox"/);
  assert.match(inputs[0], /\bchecked\b/);
  assert.match(inputs[0], /\bdisabled\b/);
  assert.match(inputs[1], /type="checkbox"/);
  assert.match(inputs[1], /\bdisabled\b/);
  assert.doesNotMatch(inputs[1], /\bchecked\b/);
  assert.match(html, /task-list-item/);
  assert.doesNotMatch(html, /type="text"|type="password"|value="删除"/);
});

test('standalone links follow tweet and CodePen rules; general cards remain asynchronous', async () => {
  const { html } = await renderEditorMarkdown(
    [
      'https://x.com/cosine/status/1234567890',
      '',
      'https://codepen.io/cosine/pen/abc123',
      '',
      'https://example.com/article',
      '',
      '[自定义文字](https://example.com/inline)',
    ].join('\n'),
    { ogEndpoint: '/api/editor/og' },
  );
  assert.match(html, /data-tweet-id="1234567890"/);
  assert.match(html, /class="codepen"/);
  assert.match(html, /data-slug-hash="abc123"/);
  assert.match(html, /data-editor-og-url="https:\/\/example.com\/article"/);
  assert.match(html, /data-editor-og-endpoint="\/api\/editor\/og"/);
  assert.match(html, /<a href="https:\/\/example.com\/inline" rel="noopener noreferrer">自定义文字<\/a>/);
  assert.doesNotMatch(html, /data-editor-og-url="https:\/\/example.com\/inline"/);
});

test('the browser encryption payload decrypts with the actual blog implementation', async () => {
  const plaintext = '<h2>中文秘密</h2><p>完整正文</p>';
  const password = '安全预览密码';
  const encrypted = await encryptEditorContent(plaintext, password);
  assert.equal(await decryptContent(encrypted.cipher, encrypted.iv, encrypted.salt, password), plaintext);
  assert.equal(await decryptContent(encrypted.cipher, encrypted.iv, encrypted.salt, 'wrong'), null);
  const wrapper = await encryptEditorPost(plaintext, password);
  assert.match(wrapper, /class="encrypted-post"/);
  assert.doesNotMatch(wrapper, /中文秘密|安全预览密码|完整正文/);
  const { html } = await renderEditorMarkdown(':::encrypted{password="preview-password"}\n秘密 **内容**\n:::', {
    contentConfig: { enableEncryptedBlock: true },
  });
  assert.match(html, /class="encrypted-block" data-cipher=/);
  assert.doesNotMatch(html, /preview-password|data-password|秘密|<strong>/);
});

test('content switches preserve the configured published behavior', async () => {
  const { html } = await renderEditorMarkdown('++原文++ !!秘密!!\n\nhttps://example.com', {
    contentConfig: { enableShokaEffects: false, enableShokaSpoiler: false, enableLinkEmbed: false },
  });
  assert.match(html, /\+\+原文\+\+/);
  assert.match(html, /!!秘密!!/);
  assert.doesNotMatch(html, /<ins>|spoiler-span|data-editor-og-url/);
});

test('the repository Shoka feature article renders its complete set of documented examples', async () => {
  const article = await readFile(new URL('../../content/blog/note/shoka-features.md', import.meta.url), 'utf8');
  const body = article.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const { html, headings } = await renderEditorMarkdown(body, { contentConfig: { enableEncryptedBlock: true } });
  assert.ok(headings.length > 15);
  assert.match(html, /note-block/);
  assert.match(html, /collapse-block/);
  assert.match(html, /tab-group/);
  assert.match(html, /data-audio-player/);
  assert.match(html, /data-video-player/);
  assert.match(html, /friend-links-grid/);
  assert.match(html, /<ruby>/);
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /data-password=/);
});

test('diagrams preserve source for the actual Mermaid and infographic enhancers', async () => {
  const { html } = await renderEditorMarkdown(
    '```mermaid\ngraph TD\nA-->B\n```\n\n```plain\ninfographic list-row-simple-horizontal\ndata\n  items\n    - label 示例\n```',
  );
  assert.match(html, /class="mermaid" data-language="mermaid"/);
  assert.match(html, /data-diagram="graph TD\nA-->/);
  assert.match(html, /infographic list-row-simple-horizontal/);
  assert.doesNotMatch(html, /data-processed=/);
});
