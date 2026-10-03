import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeDraft, type EditorDraft, listDrafts, readDraft, removeDraft, writeDraft } from './storage';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const first: EditorDraft = {
  id: 'one',
  title: '第一篇',
  source: '\uFEFF---\r\ntitle: "第一篇" # 注释\r\n---\r\n原文\r\n',
  updated: 1,
};
const second: EditorDraft = { id: 'two', title: '第二篇', source: '# 第二篇\n', updated: 2 };

test('multiple drafts retain whole source independently and restore the most recent draft', () => {
  const storage = memoryStorage();
  writeDraft(storage, first);
  writeDraft(storage, second);
  assert.equal(listDrafts(storage).length, 2);
  assert.deepEqual(readDraft(storage, first.id), first);
  assert.deepEqual(activeDraft(storage), second);
  writeDraft(storage, { ...first, source: `${first.source}新内容` });
  assert.equal(listDrafts(storage).length, 2);
  assert.equal(readDraft(storage, second.id)?.source, second.source);
  assert.equal(activeDraft(storage)?.source, `${first.source}新内容`);
  assert.ok(!JSON.stringify(listDrafts(storage)).includes('新内容'));
});

test('deleting a draft keeps the other drafts and clears only its active pointer', () => {
  const storage = memoryStorage();
  writeDraft(storage, first);
  writeDraft(storage, second);
  removeDraft(storage, first.id);
  assert.deepEqual(activeDraft(storage), second);
  removeDraft(storage, second.id);
  assert.equal(activeDraft(storage), null);
  assert.deepEqual(listDrafts(storage), []);
  assert.equal(readDraft(storage, first.id), null);
});

test('corrupt cache entries are ignored and storage quota failures do not erase other drafts', () => {
  const storage = memoryStorage();
  writeDraft(storage, first);
  const full: Storage = {
    ...storage,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.throws(() => writeDraft(full, second));
  assert.equal(readDraft(storage, first.id)?.source, first.source);
  storage.setItem('koharu-editor:draft:two', '{invalid');
  assert.equal(readDraft(storage, 'two'), null);
  storage.setItem('koharu-editor:drafts:v1', '{invalid');
  assert.deepEqual(listDrafts(storage), []);
});
