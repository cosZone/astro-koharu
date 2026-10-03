import assert from 'node:assert/strict';
import test from 'node:test';
import { history, redo, undo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { updateEditorProperty } from './document';
import { formatEditorSelection } from './formatting';
import { insertEditorTemplate, updateEditorSource } from './source-edit';

function target(source: string, ranges: ReturnType<typeof EditorSelection.range>[], mainIndex = 0) {
  let state = EditorState.create({
    doc: source,
    selection: EditorSelection.create(ranges, mainIndex),
    extensions: [
      history(),
      markdown(),
      EditorState.allowMultipleSelections.of(true),
      EditorState.lineSeparator.of(source.includes('\r\n') ? '\r\n' : '\n'),
    ],
  });
  return {
    get state() {
      return state;
    },
    dispatch(transaction: ReturnType<EditorState['update']>) {
      state = transaction.state;
    },
  };
}

for (const newline of ['\n', '\r\n']) {
  test(`property edits retain body selection, source and undo (${JSON.stringify(newline)})`, () => {
    const source = `\uFEFF---${newline}title: 原标题 # 注释${newline}custom: null${newline}---${newline}BODY`;
    const from = source.replace(/\r\n/g, '\n').indexOf('BODY');
    const editor = target(source, [EditorSelection.range(from + 4, from)]);
    const edited = updateEditorProperty(source, 'title', '更长的标题');
    updateEditorSource(editor, edited);
    assert.equal(editor.state.sliceDoc(), edited);
    assert.equal(editor.state.sliceDoc(editor.state.selection.main.from, editor.state.selection.main.to), 'BODY');
    assert.ok(editor.state.selection.main.anchor > editor.state.selection.main.head);
    formatEditorSelection(editor, 'bold');
    assert.equal(editor.state.sliceDoc(), edited.replace('BODY', '**BODY**'));
    assert.equal(undo(editor), true);
    assert.equal(editor.state.sliceDoc(), edited);
    assert.equal(undo(editor), true);
    assert.equal(editor.state.sliceDoc(), source);
    assert.equal(redo(editor), true);
    assert.equal(editor.state.sliceDoc(), edited);
  });
}

test('property edits safely map selections inside the changed YAML and multiple body ranges', () => {
  const source = '---\ntitle: A\n---\n甲和乙';
  const editor = target(source, [EditorSelection.range(11, 12), EditorSelection.range(17, 18), EditorSelection.range(19, 20)]);
  updateEditorSource(editor, updateEditorProperty(source, 'title', 'Longer'));
  for (const range of editor.state.selection.ranges) assert.ok(range.from <= range.to && range.to <= editor.state.doc.length);
  assert.doesNotThrow(() => editor.dispatch(editor.state.update(editor.state.replaceSelection('X'))));
});

test('templates reject every selection crossing metadata, preserving the whole source', () => {
  const source = '---\ntitle: A\n---\nBODY';
  const editor = target(source, [EditorSelection.range(11, 12), EditorSelection.range(17, 21)], 1);
  const before = editor.state.selection;
  assert.equal(insertEditorTemplate(editor, ':::info\n模板\n:::'), false);
  assert.equal(editor.state.sliceDoc(), source);
  assert.equal(editor.state.selection, before);
  const crossing = target(source, [EditorSelection.range(11, 21)]);
  assert.equal(insertEditorTemplate(crossing, '**模板**'), false);
  assert.equal(crossing.state.sliceDoc(), source);
});

test('multi-selection templates remain outside YAML, preserve CRLF and undo once', () => {
  const source = '\uFEFF---\r\ntitle: A # 注释\r\n---\r\n甲和乙';
  const from = source.replace(/\r\n/g, '\n').indexOf('甲');
  const editor = target(source, [EditorSelection.range(from, from + 1), EditorSelection.range(from + 2, from + 3)]);
  assert.equal(insertEditorTemplate(editor, ':::info\n模板\n:::'), true);
  assert.equal(editor.state.sliceDoc().split('---\r\n')[1], 'title: A # 注释\r\n');
  assert.equal(editor.state.selection.ranges.length, 2);
  assert.equal(undo(editor), true);
  assert.equal(editor.state.sliceDoc(), source);
});

test('an inline template after metadata without a final newline starts a body line', () => {
  const source = '---\ntitle: A\n---';
  const editor = target(source, [EditorSelection.cursor(source.length)]);
  assert.equal(insertEditorTemplate(editor, '**模板**'), true);
  assert.equal(editor.state.sliceDoc(), `${source}\n**模板**`);
  assert.equal(undo(editor), true);
  assert.equal(editor.state.sliceDoc(), source);
});
