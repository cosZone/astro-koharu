import { isolateHistory } from '@codemirror/commands';
import { ensureSyntaxTree, language } from '@codemirror/language';
import { type ChangeSpec, EditorSelection, type EditorState, type SelectionRange, type StateCommand } from '@codemirror/state';
import { parseEditorDocument } from './document';

export const toolbarFormats = ['bold', 'italic', 'heading', 'link', 'image', 'note', 'code', 'formula'] as const;
export type EditorFormat = (typeof toolbarFormats)[number];
type Edit = { changes?: ChangeSpec; range: SelectionRange };

function selection(range: SelectionRange, from: number, to: number) {
  return range.anchor > range.head ? EditorSelection.range(to, from) : EditorSelection.range(from, to);
}

function replace(state: EditorState, range: SelectionRange, text: string, start: number, length: number): Edit {
  return {
    changes: { from: range.from, to: range.to, insert: state.toText(text.replace(/\n/g, state.lineBreak)) },
    range: selection(range, range.from + start, range.from + start + length),
  };
}

function unwrapInline(state: EditorState, range: SelectionRange, name: string): Edit | undefined {
  const tree = ensureSyntaxTree(state, range.to, 50);
  for (let outer = tree?.resolveInner(range.from, 1) ?? null; outer; outer = outer.parent) {
    let node = outer;
    if (node.name !== name && range.from === node.from && range.to === node.to) {
      while (['Emphasis', 'StrongEmphasis'].includes(node.name) && node.name !== name) {
        const inner = node.firstChild?.nextSibling;
        if (!inner || inner.from !== node.firstChild?.to || inner.to !== node.lastChild?.from) break;
        node = inner;
      }
    }
    if (node.name !== name) continue;
    const open = node.firstChild;
    const close = node.lastChild;
    if (!open || !close || open === close) continue;
    let from = open.to;
    let to = close.from;
    if (name === 'InlineCode') {
      const content = state.doc.sliceString(from, to);
      if (content.startsWith(' ') && content.endsWith(' ') && content.trim()) {
        from++;
        to--;
      }
    }
    let inner = open.nextSibling;
    // Nested bold/italic can share a *** delimiter run; use the parser's boundaries.
    while (inner && inner.to === close.from && ['Emphasis', 'StrongEmphasis'].includes(inner.name)) {
      from = inner.firstChild?.to ?? from;
      to = inner.lastChild?.from ?? to;
      inner = inner.firstChild?.nextSibling ?? null;
    }
    if (
      range.empty
        ? range.from < from || range.to > to
        : ((range.from < node.from || range.to > node.to) && !(range.from === outer.from && range.to === outer.to)) ||
          range.from > from ||
          range.to < to
    )
      continue;
    // Remove only this format's markers, preserving nested formats and the source selection.
    const contentFrom = name === 'InlineCode' ? from : open.to;
    const contentTo = name === 'InlineCode' ? to : close.from;
    const changes = state.changes([
      { from: node.from, to: contentFrom },
      { from: contentTo, to: node.to },
    ]);
    return { changes, range: range.map(changes) };
  }
}

function inline(state: EditorState, range: SelectionRange, action: 'bold' | 'italic' | 'code' | 'formula'): Edit {
  const nodeName = { bold: 'StrongEmphasis', italic: 'Emphasis', code: 'InlineCode', formula: '' }[action];
  const unwrapped = nodeName && unwrapInline(state, range, nodeName);
  if (unwrapped) return unwrapped;
  const selected = state.doc.sliceString(range.from, range.to);
  const placeholders = { bold: '重点文字', italic: '强调文字', code: '代码', formula: 'E = mc^2' };
  const before = action === 'code' ? '' : (selected.match(/^\s*/)?.[0] ?? '');
  const after = action === 'code' || !selected.trim() ? '' : (selected.match(/\s*$/)?.[0] ?? '');
  const content = (action === 'code' ? selected : selected.trim()) || placeholders[action];
  let mark = { bold: '**', italic: '*', code: '`', formula: '$' }[action];
  if (action === 'code') {
    const longest = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
    mark = '`'.repeat(longest + 1);
  }
  if (action === 'formula') {
    const surrounds =
      state.doc.sliceString(range.from - 1, range.from) === '$' && state.doc.sliceString(range.to, range.to + 1) === '$';
    const escaped = range.from > 1 && state.doc.sliceString(range.from - 2, range.from - 1) === '\\';
    const display =
      state.doc.sliceString(range.from - 2, range.from) === '$$' || state.doc.sliceString(range.to, range.to + 2) === '$$';
    if (surrounds && !escaped && !display) {
      const changes = state.changes([
        { from: range.from - 1, to: range.from },
        { from: range.to, to: range.to + 1 },
      ]);
      return { changes, range: range.map(changes) };
    }
    if (content.startsWith('$') && content.endsWith('$') && !content.startsWith('$$') && content.length > 2)
      return replace(state, range, `${before}${content.slice(1, -1)}${after}`, before.length, content.length - 2);
  }
  const pad =
    action === 'code' &&
    (content.startsWith('`') || content.endsWith('`') || (content.startsWith(' ') && content.endsWith(' ') && content.trim()))
      ? ' '
      : '';
  const prefix = `${before}${mark}${pad}`;
  return replace(state, range, `${prefix}${content}${pad}${mark}${after}`, prefix.length, content.length);
}

/** Aggregate partial selections so one emphasis node is split only once. */
function partialEmphasis(state: EditorState, action: 'bold' | 'italic') {
  const tree = ensureSyntaxTree(state, state.selection.ranges.at(-1)?.to ?? 0, 50);
  if (!tree) return state.facet(language) ? false : null;
  const name = action === 'bold' ? 'StrongEmphasis' : 'Emphasis';
  type Node = ReturnType<typeof tree.resolveInner>;
  const groups = new Map<number, { node: Node; cuts: { from: number; to: number }[] }>();
  const ordinary: SelectionRange[] = [];
  for (const range of state.selection.ranges) {
    let target: Node | null = null;
    for (let node: Node | null = tree.resolveInner(range.from, 1); node; node = node.parent) {
      if (node.name === name) {
        target = node;
        break;
      }
    }
    const open = target?.firstChild;
    const close = target?.lastChild;
    if (
      !target ||
      !open ||
      !close ||
      range.empty ||
      unwrapInline(state, range, name) ||
      (range.from <= open.to && range.to >= close.from)
    ) {
      ordinary.push(range);
      continue;
    }
    if (range.from < open.to || range.to > close.from) return false;
    const cut = { from: range.from, to: range.to };
    for (let child = open.nextSibling; child && child.from < close.from; child = child.nextSibling) {
      const crossesStart = child.from < cut.from && cut.from < child.to;
      const crossesEnd = child.from < cut.to && cut.to < child.to;
      if (!crossesStart && !crossesEnd) continue;
      const innerOpen = child.firstChild;
      const innerClose = child.lastChild;
      if (
        !['Emphasis', 'StrongEmphasis', 'InlineCode'].includes(child.name) ||
        !innerOpen ||
        !innerClose ||
        cut.from > innerOpen.to ||
        cut.to < innerClose.from
      )
        return false;
      cut.from = Math.min(cut.from, child.from);
      cut.to = Math.max(cut.to, child.to);
    }
    let group = groups.get(target.from);
    if (!group) {
      group = { node: target, cuts: [] };
      groups.set(target.from, group);
    }
    group.cuts.push(cut);
  }
  if (!groups.size) return null;
  const edits: ChangeSpec[] = [];
  const retained: { from: number; to: number }[] = [];
  const bounds = [...groups.values()].sort((a, b) => a.node.from - b.node.from);
  for (const [index, group] of bounds.entries()) {
    if (index > 0 && bounds[index - 1].node.to > group.node.from) return false;
    if (ordinary.some((range) => range.from < group.node.to && range.to > group.node.from)) return false;
    const open = group.node.firstChild;
    const close = group.node.lastChild;
    if (!open || !close) return false;
    const cuts = group.cuts.sort((a, b) => a.from - b.from);
    const mark = action === 'bold' ? '**' : '*';
    edits.push({ from: group.node.from, to: open.to }, { from: close.from, to: group.node.to });
    const keep = (from: number, to: number) => {
      const text = state.doc.sliceString(from, to);
      if (!text.trim()) return;
      const start = from + (text.match(/^\s*/)?.[0].length ?? 0);
      const end = to - (text.match(/\s*$/)?.[0].length ?? 0);
      edits.push({ from: start, insert: mark }, { from: end, insert: mark });
      retained.push({ from: start, to: end });
    };
    let position = open.to;
    for (const cut of cuts) {
      if (cut.from > position) keep(position, cut.from);
      position = Math.max(position, cut.to);
    }
    if (position < close.from) keep(position, close.from);
  }
  const ordinaryEdits = state.changeByRange((range) => (ordinary.includes(range) ? emphasis(state, range, action) : { range }));
  const partialChanges = state.changes(edits).map(ordinaryEdits.changes);
  const changes = ordinaryEdits.changes.compose(partialChanges);
  const next = state.update({ changes }).state;
  const nextTree = ensureSyntaxTree(next, changes.mapPos(bounds.at(-1)?.node.to ?? 0), 50);
  if (!nextTree) return false;
  // Punctuation and adjacent delimiter runs can change Markdown flanking rules.
  for (const range of retained) {
    const from = changes.mapPos(range.from, 1);
    const to = changes.mapPos(range.to, -1);
    let preserved = false;
    for (let node: Node | null = nextTree.resolveInner(from, 1); node; node = node.parent) {
      if (node.name === name && node.from <= from && node.to >= to) preserved = true;
    }
    if (!preserved) return false;
  }
  return { changes, selection: ordinaryEdits.selection.map(partialChanges) };
}

function emphasis(state: EditorState, range: SelectionRange, action: 'bold' | 'italic'): Edit {
  const unwrapped = unwrapInline(state, range, action === 'bold' ? 'StrongEmphasis' : 'Emphasis');
  if (unwrapped) return unwrapped;
  const text = state.doc.sliceString(range.from, range.to);
  if (!text.includes('\n')) return inline(state, range, action);
  const edits: ChangeSpec[] = [];
  let offset = range.from;
  for (const line of text.split('\n')) {
    if (line.trim()) {
      const edit = inline(state, EditorSelection.range(offset, offset + line.length), action);
      if (edit.changes) edits.push(edit.changes);
    }
    offset += line.length + 1;
  }
  const changes = state.changes(edits);
  return {
    changes,
    range: selection(range, changes.mapPos(range.from, 1), changes.mapPos(range.to, -1)),
  };
}

function matchingBlock(state: EditorState, from: number, to: number, action: 'note' | 'code' | 'formula') {
  const first = state.doc.lineAt(from);
  const last = state.doc.lineAt(to);
  if (first.from !== from || last.to !== to || last.number - first.number < 2) return false;
  if (action === 'code') {
    const tree = ensureSyntaxTree(state, to, 50);
    for (let node = tree?.resolveInner(from, 1) ?? null; node; node = node.parent) {
      if (node.name !== 'FencedCode' || node.from !== from || node.to !== to) continue;
      const open = first.text.match(/^(`{3,}|~{3,})/)?.[1];
      return Boolean(open && new RegExp(`^${open[0]}{${open.length},}\\s*$`).test(last.text));
    }
    return false;
  }
  if (action === 'formula') {
    if (first.text !== '$$' || last.text !== '$$') return false;
    for (let number = first.number + 1; number < last.number; number++) {
      if (state.doc.line(number).text.trim() === '$$') return false;
    }
    return true;
  }
  if (first.text !== ':::info') return false;
  let depth = 1;
  let fence = '';
  for (let number = first.number + 1; number <= last.number; number++) {
    const line = state.doc.line(number).text;
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = '';
      continue;
    }
    const code = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (code) {
      fence = code[1];
      continue;
    }
    if (/^:::\S/.test(line)) depth++;
    else if (line.trim() === ':::') depth--;
    if (depth === 0) return number === last.number;
  }
  return false;
}

function unwrapBlock(state: EditorState, range: SelectionRange, action: 'note' | 'code' | 'formula'): Edit | undefined {
  if (matchingBlock(state, range.from, range.to, action)) {
    const first = state.doc.lineAt(range.from);
    const last = state.doc.lineAt(range.to);
    const text = state.doc.sliceString(first.to + 1, last.from - 1);
    return replace(state, range, text, 0, text.length);
  }
  const first = state.doc.lineAt(range.from);
  const last = state.doc.lineAt(range.to);
  if (range.from === first.from && range.to === last.to && first.number > 1 && last.number < state.doc.lines) {
    const open = state.doc.line(first.number - 1);
    const close = state.doc.line(last.number + 1);
    if (matchingBlock(state, open.from, close.to, action)) {
      const changes = state.changes([
        { from: open.from, to: first.from },
        { from: last.to, to: close.to },
      ]);
      return { changes, range: range.map(changes) };
    }
  }
  return undefined;
}

function block(state: EditorState, range: SelectionRange, action: 'note' | 'code' | 'formula'): Edit {
  const text = state.doc.sliceString(range.from, range.to) || { note: '补充说明', code: '代码', formula: 'E = mc^2' }[action];
  const fence = '`'.repeat(Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1)));
  const open = { note: ':::info', code: fence, formula: '$$' }[action];
  const close = { note: ':::', code: fence, formula: '$$' }[action];
  const prefix = `${range.from > 0 && state.doc.sliceString(range.from - 1, range.from) !== '\n' ? '\n' : ''}${open}\n`;
  const suffix = `\n${close}${range.to < state.doc.length && state.doc.sliceString(range.to, range.to + 1) !== '\n' ? '\n' : ''}`;
  return replace(state, range, `${prefix}${text}${suffix}`, prefix.length, text.length);
}

function link(state: EditorState, range: SelectionRange, image: boolean): Edit {
  const tree = ensureSyntaxTree(state, range.to, 50);
  for (let node = tree?.resolveInner(range.from, 1) ?? null; node; node = node.parent) {
    if (node.name !== (image ? 'Image' : 'Link') || range.to > node.to) continue;
    const url = node.getChild('URL');
    if (url) return { range: EditorSelection.range(url.from, url.to) };
  }
  const text = state.doc.sliceString(range.from, range.to);
  const isURL = /^https?:\/\/\S+$/i.test(text);
  const label = (text && !isURL ? text : image ? '描述图片内容' : '链接文字').replace(/[\\[\]]/g, '\\$&');
  const url = (isURL ? text : image ? 'https://example.com/image.webp' : 'https://example.com').replace(/[\\()]/g, '\\$&');
  const prefix = `${image ? '!' : ''}[`;
  const value = `${prefix}${label}](${url})`;
  return replace(
    state,
    range,
    value,
    text && !isURL ? prefix.length + label.length + 2 : prefix.length,
    text && !isURL ? url.length : label.length,
  );
}

function heading(state: EditorState) {
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const last = state.doc.lineAt(range.empty ? range.to : range.to - 1).number;
    for (let number = state.doc.lineAt(range.from).number; number <= last; number++) lines.add(number);
  }
  const content = [...lines].map((number) => state.doc.line(number));
  const remove = content.filter((line) => line.text.trim()).every((line) => /^##[ \t]+/.test(line.text));
  const edits = content.flatMap((line) => {
    if (!line.text.trim()) {
      return state.selection.ranges.some((range) => range.empty && state.doc.lineAt(range.from).number === line.number)
        ? [{ from: line.from, to: line.to, insert: '## 小节标题' }]
        : [];
    }
    const existing = line.text.match(/^#{1,6}[ \t]+/)?.[0] ?? '';
    return [{ from: line.from, to: line.from + existing.length, insert: remove ? '' : '## ' }];
  });
  const changes = state.changes(edits);
  const ranges = state.selection.ranges.map((range) => {
    const line = state.doc.lineAt(range.from);
    if (range.empty && !line.text.trim()) {
      const from = changes.mapPos(line.from, -1) + 3;
      return EditorSelection.range(from, from + '小节标题'.length);
    }
    return range.map(changes);
  });
  return { changes, selection: EditorSelection.create(ranges, state.selection.mainIndex) };
}

export function formatEditorSelection(target: Parameters<StateCommand>[0], action: EditorFormat): boolean {
  const { state } = target;
  if (state.readOnly) return false;
  const source = state.doc.toString();
  const bodyStart = source.length - parseEditorDocument(source).body.length;
  if (bodyStart > 0 && bodyStart === source.length && !source.endsWith('\n')) return false;
  if (state.selection.ranges.some((range) => range.from < bodyStart)) return false;
  if (
    action === 'formula' &&
    state.selection.ranges.some(
      (range) => /^\$\$[ \t]*$/m.test(state.doc.sliceString(range.from, range.to)) && !unwrapBlock(state, range, action),
    )
  )
    return false;
  const partial = action === 'bold' || action === 'italic' ? partialEmphasis(state, action) : null;
  if (partial === false) return false;
  const edits =
    partial ??
    (action === 'heading'
      ? heading(state)
      : state.changeByRange((range) => {
          if (action === 'bold' || action === 'italic') return emphasis(state, range, action);
          if (action === 'link' || action === 'image') return link(state, range, action === 'image');
          const unwrapped = unwrapBlock(state, range, action);
          if (unwrapped) return unwrapped;
          if (action === 'note' || state.doc.sliceString(range.from, range.to).includes('\n'))
            return block(state, range, action);
          return inline(state, range, action);
        }));
  target.dispatch(
    state.update({ ...edits, userEvent: 'input.format', annotations: isolateHistory.of('full'), scrollIntoView: true }),
  );
  return true;
}
