import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import { remarkIns, remarkMark } from './remark-shoka-effects';
import { remarkShokaPreprocess } from './remark-shoka-preprocess';
import { remarkShokaRuby } from './remark-shoka-ruby';
import { remarkShokaSpoiler } from './remark-shoka-spoiler';
import { preprocessShokaSyntax } from './shoka-preprocessor';

const guideExample = '{漢字^かんじ}的注音示例。{取り返す^とりかえす}是日语中"取回"的意思。';

async function render(source: string, { enableSuperSub = true, enableRuby = true } = {}) {
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    smartypants: false,
    remarkPlugins: [
      [remarkShokaPreprocess, { enableSuperSub }],
      remarkMath,
      remarkShokaSpoiler,
      ...(enableRuby ? [remarkShokaRuby] : []),
      remarkIns,
      remarkMark,
    ],
  });
  return (await processor.render(source)).code;
}

test('the guide example preserves both Ruby expressions before parsing', () => {
  assert.equal(preprocessShokaSyntax(guideExample), guideExample);
});

test('the guide example renders two independent Ruby annotations', async () => {
  assert.equal(
    await render(guideExample),
    '<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>的注音示例。<ruby>取り返す<rp>(</rp><rt>とりかえす</rt><rp>)</rp></ruby>是日语中"取回"的意思。</p>',
  );
});

test('adjacent standard, whole-word and emphasis-dot annotations retain their boundaries', async () => {
  const html = await render('{漢字^かんじ}{熟語^=じゅくご}{重点^*}');
  assert.equal(
    html,
    '<p><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby><ruby>熟語<rp>(</rp><rt>じゅくご</rt><rp>)</rp></ruby><span style="text-emphasis:filled circle;-webkit-text-emphasis:filled circle">重点</span></p>',
  );
});

test('Ruby can be directly surrounded by superscript and subscript', async () => {
  const html = await render('x^2^{漢字^かんじ}H~2~O{熟語^=じゅくご}y^3^');
  assert.equal(
    html,
    '<p>x<sup>2</sup><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>H<sub>2</sub>O<ruby>熟語<rp>(</rp><rt>じゅくご</rt><rp>)</rp></ruby>y<sup>3</sup></p>',
  );
});

test('preprocessing leaves super/subscript-like text inside Ruby intact', () => {
  const source = '{漢字^か~ん~じ}{式^=x^2^}';
  assert.equal(preprocessShokaSyntax(source), source);
});

test('carets inside Ruby stay annotation text', async () => {
  const html = await render('{式^=x^2^}');
  assert.match(html, /<rt>x\^2\^<\/rt>/);
  assert.doesNotMatch(html, /<(sup|sub)>/);
});

test('code and math preserve Ruby and super/subscript source', async () => {
  const source = [
    '`{漢字^かんじ}x^2^H~2~O`',
    '```markdown\n{漢字^かんじ}{熟語^じゅくご}x^2^H~2~O\n```',
    '$a^{x^2}+b^{y^3}$',
    '$$\na^{x^2}+b^{y^3}\n$$',
  ].join('\n\n');
  assert.equal(preprocessShokaSyntax(source), source);
  const html = await render(source);
  assert.match(html, /<code>\{漢字\^かんじ\}x\^2\^H~2~O<\/code>/);
  assert.match(html, /class="language-math math-inline"/);
  assert.match(html, /class="language-math math-display"/);
  assert.doesNotMatch(html, /<(ruby|sup|sub)>/);
});

test('Ruby renders when super/subscript effects are disabled', async () => {
  const html = await render(`${guideExample}x^2^H~2~O`, { enableSuperSub: false });
  assert.equal((html.match(/<ruby>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<(sup|sub)>/);
  assert.match(html, /x\^2\^/);
});

test('disabled Ruby remains literal while standalone super/subscript still works', async () => {
  const html = await render(`${guideExample}x^2^H~2~O`, { enableRuby: false });
  assert.equal(html, `<p>${guideExample}x<sup>2</sup>H<sub>2</sub>O</p>`);
});

test('Ruby base and annotation preserve HTML escaping', async () => {
  const html = await render('{&lt;img&gt;^&lt;script&gt;}{A&amp;B^C&amp;D}');
  assert.match(html, /<ruby>&#x3C;img><rp>\(<\/rp><rt>&#x3C;script><\/rt>/);
  assert.match(html, /<ruby>A&#x26;B<rp>\(<\/rp><rt>C&#x26;D<\/rt>/);
  assert.doesNotMatch(html, /<(img|script)[\s>]/);
});

test('escaped spoiler and effect delimiters remain literal inside Ruby syntax', async () => {
  for (const delimiter of ['!!', '++', '==']) {
    for (const enableRuby of [true, false]) {
      const html = await render(`{漢字^\\${delimiter}literal${delimiter}}`, { enableRuby });
      assert.equal(html, `<p>{漢字^${delimiter[0]}<!-- -->${delimiter[1]}literal${delimiter}}</p>`);
      assert.doesNotMatch(html, /<(spoiler-span|ins|mark)>/);
    }
  }
});
