import assert from 'node:assert/strict';
import test from 'node:test';
import { history, redo, undo } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { clearEditorHistory, restoreEditorHistory, saveEditorHistory } from './editor-history';
import { formatEditorSelection } from './formatting';

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

test('format undo and redo survive a reload with the exact same CRLF source', () => {
  const source = '\uFEFF---\r\ntitle: 历史\r\n---\r\n文字';
  const config = { extensions: [history(), EditorState.lineSeparator.of('\r\n')] };
  let state = EditorState.create({
    ...config,
    doc: source,
    selection: { anchor: source.replace(/\r\n/g, '\n').length - 2, head: source.replace(/\r\n/g, '\n').length },
  });
  const target = {
    get state() {
      return state;
    },
    dispatch: (transaction: ReturnType<EditorState['update']>) => {
      state = transaction.state;
    },
  };
  formatEditorSelection(target, 'bold');
  const savedSource = state.sliceDoc();
  const cache = storage();
  saveEditorHistory(cache, 'cms-draft', state);
  const restored = restoreEditorHistory(cache, 'cms-draft', savedSource, config);
  assert.ok(restored);
  state = restored;
  assert.equal(undo(target), true);
  assert.equal(state.sliceDoc(), source);
  assert.equal(redo(target), true);
  assert.equal(state.sliceDoc(), savedSource);
});

test('history from another draft or a changed disk source is not restored', () => {
  const cache = storage();
  saveEditorHistory(cache, 'first', EditorState.create({ doc: '原文', extensions: history() }));
  assert.equal(restoreEditorHistory(cache, 'second', '原文', { extensions: history() }), null);
  assert.equal(restoreEditorHistory(cache, 'first', '磁盘新原文', { extensions: history() }), null);
  assert.equal(restoreEditorHistory(cache, 'first', '原文', { extensions: history() }), null);
});

test('malformed or unavailable optional history never prevents opening source', () => {
  const cache = storage();
  cache.setItem('koharu-editor:history:v1:broken', '{bad');
  assert.equal(restoreEditorHistory(cache, 'broken', '正文', { extensions: history() }), null);
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {},
  };
  assert.equal(restoreEditorHistory(blocked, 'broken', '正文', { extensions: history() }), null);
  assert.doesNotThrow(() =>
    saveEditorHistory(
      {
        setItem: () => {
          throw new Error('quota');
        },
      },
      'large',
      EditorState.create({ doc: '正文', extensions: history() }),
    ),
  );
});

test('deleting a draft clears only that draft history', () => {
  const cache = storage();
  const config = { extensions: history() };
  const state = EditorState.create({ ...config, doc: '正文' });
  saveEditorHistory(cache, 'deleted', state);
  saveEditorHistory(cache, 'kept', state);
  clearEditorHistory(cache, 'deleted');
  assert.equal(restoreEditorHistory(cache, 'deleted', '正文', config), null);
  assert.ok(restoreEditorHistory(cache, 'kept', '正文', config));
});
