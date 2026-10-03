import { redo, undo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { Compartment, EditorState, type EditorStateConfig } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, placeholder } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';
import { parseEditorDocument } from '../document';
import { restoreEditorHistory, saveEditorHistory } from '../editor-history';
import { type EditorFormat, formatEditorSelection } from '../formatting';
import { insertEditorTemplate, updateEditorSource } from '../source-edit';

export interface CodeEditorHandle {
  insert: (source: string) => boolean;
  saveHistory: () => void;
  format: (action: EditorFormat) => boolean;
  undo: () => void;
  redo: () => void;
  focus: () => void;
}

interface Props {
  source: string;
  draftId: string;
  onChange: (source: string) => void;
  onSelectionChange?: (position: { line: number; column: number }) => void;
  ref?: Ref<CodeEditorHandle>;
}

export default function CodeEditor({ source, draftId, onChange, onSelectionChange, ref }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const persistHistory = useRef<() => void>(() => {});
  const change = useRef(onChange);
  change.current = onChange;
  const selectionChange = useRef(onSelectionChange);
  selectionChange.current = onSelectionChange;
  const initial = useRef(source);
  initial.current = source;

  useEffect(() => {
    if (!container.current) return;
    container.current.dataset.draftId = draftId;
    const reportSelection = (state: EditorState) => {
      const position = state.selection.main.head;
      const line = state.doc.lineAt(position);
      selectionChange.current?.({ line: line.number, column: position - line.from + 1 });
    };
    const theme = new Compartment();
    const darkTheme = () => (document.documentElement.classList.contains('dark') ? oneDark : []);
    const config: EditorStateConfig = {
      doc: initial.current,
      selection: {
        anchor: initial.current
          .slice(0, initial.current.length - parseEditorDocument(initial.current).body.length)
          .replace(/\r\n/g, '\n').length,
      },
      extensions: [
        EditorState.lineSeparator.of(initial.current.includes('\r\n') ? '\r\n' : '\n'),
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        placeholder('写下你的想法…'),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown 源码', spellcheck: 'false', autocapitalize: 'off' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) change.current(update.state.sliceDoc());
          if (update.selectionSet || update.docChanged) reportSelection(update.state);
        }),
        EditorView.theme({
          '&': { height: '100%', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--editor-mono)' },
          '.cm-content': {
            padding: '10px 12px',
            fontSize: 'var(--editor-code-size, 15px)',
            lineHeight: '1.65',
            caretColor: 'hsl(var(--foreground))',
          },
          '.cm-content span': { textDecoration: 'none' },
          '.cm-gutters': { background: 'transparent', border: 'none', color: 'hsl(var(--muted-foreground) / .45)' },
          '&.cm-focused': { outline: 'none' },
          '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'hsl(var(--foreground))', borderLeftWidth: '2px' },
          '.cm-selectionHandle': { backgroundColor: 'hsl(var(--foreground))' },
          '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'hsl(var(--primary) / .055)' },
          '&.cm-focused .cm-selectionBackground': { backgroundColor: 'hsl(var(--primary) / .28)' },
        }),
        theme.of(darkTheme()),
      ],
    };
    let state: EditorState | null = null;
    try {
      state = restoreEditorHistory(sessionStorage, draftId, initial.current, config);
    } catch {
      // Storage access can be unavailable; the source editor still works.
    }
    const editor = new EditorView({ parent: container.current, state: state ?? EditorState.create(config) });
    const saveHistory = () => {
      try {
        saveEditorHistory(sessionStorage, draftId, editor.state);
      } catch {
        // A page reload must not depend on session storage being available.
      }
    };
    window.addEventListener('pagehide', saveHistory);
    persistHistory.current = saveHistory;
    view.current = editor;
    reportSelection(editor.state);
    const observer = new MutationObserver(() => editor.dispatch({ effects: theme.reconfigure(darkTheme()) }));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('pagehide', saveHistory);
      observer.disconnect();
      editor.destroy();
      view.current = null;
      persistHistory.current = () => {};
    };
  }, [draftId]);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.sliceDoc() !== source) updateEditorSource(editor, source);
  }, [source]);

  useImperativeHandle(
    ref,
    () => ({
      insert: (text) => {
        const editor = view.current;
        if (!editor) return false;
        const applied = insertEditorTemplate(editor, text);
        editor.focus();
        return applied;
      },
      saveHistory: () => persistHistory.current(),
      format: (action) => {
        const editor = view.current;
        if (!editor) return false;
        const applied = formatEditorSelection(editor, action);
        editor.focus();
        return applied;
      },
      undo: () => {
        if (view.current) {
          undo(view.current);
          view.current.focus();
        }
      },
      redo: () => {
        if (view.current) {
          redo(view.current);
          view.current.focus();
        }
      },
      focus: () => view.current?.focus(),
    }),
    [],
  );

  return <div ref={container} className="editor-code" />;
}
