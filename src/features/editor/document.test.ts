import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEditorDocument, updateEditorProperty } from './document';

test('editing a property retains unknown YAML values, comments and the entire body', () => {
  const source =
    '---\ntitle: "旧标题" # 手写备注\ncustom:\n  answer: null\n  color: "#ff00ff"\n---\n\n;;;tab 示例\n++原文++\n;;;\n';
  const changed = updateEditorProperty(source, 'title', '新标题');
  assert.equal(parseEditorDocument(changed).data.title, '新标题');
  assert.match(changed, /手写备注/);
  assert.match(changed, /answer: null/);
  assert.match(changed, /color: "#ff00ff"/);
  assert.equal(parseEditorDocument(changed).body, parseEditorDocument(source).body);
});

test('malformed frontmatter remains editable and does not get overwritten by a property form', () => {
  const source = '---\ntitle: [unfinished\n---\n正文';
  assert.ok(parseEditorDocument(source).error);
  assert.equal(parseEditorDocument(source).body, '正文');
  assert.throws(() => updateEditorProperty(source, 'title', '新标题'));
});

test('property editing preserves a BOM, CRLF and body bytes', () => {
  const source = '\uFEFF---\r\ntitle: "旧标题"\r\ncustom: null # 留住备注\r\n---\r\n\r\n原文\r\n';
  const changed = updateEditorProperty(source, 'title', '新标题');
  assert.ok(changed.startsWith('\uFEFF---\r\n'));
  assert.ok(!/(?<!\r)\n/.test(changed));
  assert.match(changed, /custom: null # 留住备注/);
  assert.equal(parseEditorDocument(changed).body, '\r\n原文\r\n');
});
