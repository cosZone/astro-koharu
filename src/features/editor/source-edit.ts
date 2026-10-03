import { isolateHistory } from '@codemirror/commands';
import { EditorSelection, type StateCommand } from '@codemirror/state';
import { parseEditorDocument } from './document';

type Target = Parameters<StateCommand>[0];

/** Apply external property edits without replacing the body or losing its selection. */
export function updateEditorSource(target: Target, source: string): void {
  const { state } = target;
  const before = state.doc.toString();
  const after = source.replace(/\r\n/g, '\n');
  if (before === after) return;
  let from = 0;
  while (from < before.length && from < after.length && before[from] === after[from]) from++;
  let to = before.length;
  let end = after.length;
  while (to > from && end > from && before[to - 1] === after[end - 1]) {
    to--;
    end--;
  }
  const changes = state.changes({ from, to, insert: state.toText(after.slice(from, end).replace(/\n/g, state.lineBreak)) });
  const ranges = state.selection.ranges.map((range) => {
    if (range.empty) return EditorSelection.cursor(changes.mapPos(range.head, 1));
    const forward = range.anchor < range.head;
    return EditorSelection.range(changes.mapPos(range.anchor, forward ? -1 : 1), changes.mapPos(range.head, forward ? 1 : -1));
  });
  target.dispatch(
    state.update({
      changes,
      selection: EditorSelection.create(ranges, state.selection.mainIndex),
      userEvent: 'input.properties',
    }),
  );
}

/** Templates replace body selections; metadata is never silently moved or overwritten. */
export function insertEditorTemplate(target: Target, text: string): boolean {
  const { state } = target;
  const source = state.doc.toString();
  const bodyStart = source.length - parseEditorDocument(source).body.length;
  if (state.readOnly || state.selection.ranges.some((range) => range.from < bodyStart)) return false;
  const normalized = text.replace(/\r\n/g, '\n');
  const edits = state.changeByRange((range) => {
    const needsLine = normalized.includes('\n') || (bodyStart > 0 && bodyStart === source.length);
    const prefix = needsLine && range.from > 0 && source[range.from - 1] !== '\n' ? '\n' : '';
    const suffix = normalized.includes('\n') && !normalized.endsWith('\n') ? '\n' : '';
    const inserted = `${prefix}${normalized}${suffix}`;
    return {
      changes: { from: range.from, to: range.to, insert: state.toText(inserted.replace(/\n/g, state.lineBreak)) },
      range: EditorSelection.cursor(range.from + inserted.length),
    };
  });
  target.dispatch(
    state.update({ ...edits, userEvent: 'input.template', annotations: isolateHistory.of('full'), scrollIntoView: true }),
  );
  return true;
}
