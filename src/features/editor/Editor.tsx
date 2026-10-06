import { useRetainedValue } from '@hooks/useRetainedValue';
import { type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { copyMarkdown } from './clipboard';
import type { EditorColophonGroup } from './colophon';
import ArticleProperties from './components/ArticleProperties';
import CodeEditor, { type CodeEditorHandle } from './components/CodeEditor';
import EditorIcon from './components/EditorIcon';
import LinkPreviewSettings from './components/LinkPreviewSettings';
import PreviewFrame from './components/PreviewFrame';
import SheetHandle from './components/SheetHandle';
import SyntaxPanel from './components/SyntaxPanel';
import ViewSwitch from './components/ViewSwitch';
import {
  createEditorSource,
  documentTitle,
  type ListEdit,
  markdownFilename,
  parseEditorDocument,
  updateEditorList,
  updateEditorProperty,
} from './document';
import { clearEditorHistory } from './editor-history';
import { type EditorFormat, toolbarFormats } from './formatting';
import {
  fetchMarkdownSource,
  findImportedDraft,
  IMPORT_PARAM,
  importFilename,
  MAX_MARKDOWN_BYTES,
  parseImportSource,
  withoutImportParam,
} from './import-source';
import { readOGEndpoint, saveOGEndpoint } from './link-service';
import { cancelSheetMotion, playSheetEnter, playSheetExit } from './sheet-motion';
import { activeDraft, type DraftSummary, type EditorDraft, listDrafts, readDraft, removeDraft, writeDraft } from './storage';
import { syntaxEntries } from './syntax';

type Panel = 'drafts' | 'syntax' | 'properties' | 'copy' | 'service' | 'import' | null;
interface Props {
  ogEndpoint?: string;
  colophon?: EditorColophonGroup[];
}

const draftTime = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDraftTime(updated: number) {
  // Stored drafts are untrusted; an out-of-range timestamp makes Intl throw and would unmount the editor.
  return Number.isNaN(new Date(updated).getTime()) ? '时间未知' : draftTime.format(updated);
}

function createDraft(source = createEditorSource(), filename?: string, importedFrom?: string): EditorDraft {
  return { id: crypto.randomUUID(), title: documentTitle(source), source, updated: Date.now(), filename, importedFrom };
}

export default function Editor({ ogEndpoint = '/api/editor/og', colophon = [] }: Props) {
  const [previewEndpoint, setPreviewEndpoint] = useState(ogEndpoint);
  const [draft, setDraft] = useState<EditorDraft>(() => createDraft());
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const shownPanel = useRetainedValue(panel);
  const [panelSession, setPanelSession] = useState(0);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [mode, setMode] = useState<'body' | 'article'>('body');
  const [focus, setFocus] = useState(false);
  const [split, setSplit] = useState(50);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [cms, setCMS] = useState<{ origin: string; postId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOffer, setImportOffer] = useState<{ path: string; draft: DraftSummary } | null>(null);
  const [importFailure, setImportFailure] = useState<{ path: string; message: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const importFromBlog = useRef<(path: string) => Promise<void>>(async () => {});
  const pendingSave = useRef<{ requestId: string; draftId: string; postId: string; source: string } | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const editor = useRef<CodeEditorHandle>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const panelTrigger = useRef<HTMLElement | null>(null);
  const resizeStart = useRef<{ x: number; split: number; width: number } | null>(null);
  const copySource = useRef<HTMLTextAreaElement>(null);
  const current = useRef(draft);
  current.current = draft;
  const starterDraft = useRef(draft);
  const parsed = useMemo(() => parseEditorDocument(draft.source), [draft.source]);
  const articleTitle = typeof parsed.data.title === 'string' && parsed.data.title.trim() ? parsed.data.title : '未命名文章';

  useEffect(() => {
    try {
      setPreviewEndpoint(readOGEndpoint(localStorage, location.href) ?? ogEndpoint);
      setDrafts(listDrafts(localStorage));
      const previous = activeDraft(localStorage);
      if (previous) setDraft(previous);
    } catch {
      setError('浏览器存储不可用，请及时复制或下载文章。');
    }
    setInitialized(true);
    const requested = new URL(location.href).searchParams.get(IMPORT_PARAM);
    if (requested !== null) {
      history.replaceState(history.state, '', withoutImportParam(location.href));
      const path = parseImportSource(requested, location.origin);
      let existing: DraftSummary | null = null;
      try {
        existing = path ? findImportedDraft(listDrafts(localStorage), path) : null;
      } catch {
        // Without storage there is no earlier copy to offer; import directly.
      }
      if (!path) setError('只能导入本站文章的 Markdown 原文，链接中的地址无效。');
      else if (existing) {
        setImportOffer({ path, draft: existing });
        setPanelSession((value) => value + 1);
        setPanel('import');
      } else void importFromBlog.current(path);
    }
    const receive = (event: MessageEvent) => {
      if (!import.meta.env.DEV || event.source !== window.parent || window.parent === window) return;
      if (!URL.canParse(event.origin)) return;
      const origin = new URL(event.origin);
      if (!['localhost', '127.0.0.1'].includes(origin.hostname) || origin.port !== '4322') return;
      if (
        event.data?.type === 'koharu-cms-open' &&
        typeof event.data.source === 'string' &&
        typeof event.data.postId === 'string'
      ) {
        pendingSave.current = null;
        setSaving(false);
        let restored: EditorDraft | null = null;
        try {
          if (typeof event.data.restoreDraftId === 'string')
            restored =
              current.current.id === event.data.restoreDraftId
                ? current.current
                : readDraft(localStorage, event.data.restoreDraftId);
        } catch {
          // A failed restore below preserves the currently visible draft.
        }
        if (typeof event.data.restoreDraftId === 'string' && restored?.filename !== event.data.postId) {
          setCMS(null);
          setError('无法恢复 CMS 草稿，当前原文已保留。请复制或下载后，从文章列表重新打开文件。');
          window.parent.postMessage({ type: 'koharu-cms-detach', postId: event.data.postId }, event.origin);
          return;
        }
        const opened =
          restored && restored.filename === event.data.postId ? restored : createDraft(event.data.source, event.data.postId);
        editor.current?.saveHistory();
        setCMS({ origin: event.origin, postId: event.data.postId });
        current.current = opened;
        setDraft(opened);
        try {
          writeDraft(localStorage, opened);
          setDrafts(listDrafts(localStorage));
        } catch {
          setError('浏览器草稿保存失败，请及时复制或下载；刷新可能丢失未保存的修改。');
        }
        setStatus(restored === opened ? '已恢复 CMS 编辑草稿' : '已从 CMS 打开文章');
        window.parent.postMessage({ type: 'koharu-cms-opened', postId: event.data.postId, draftId: opened.id }, event.origin);
      }
      if (event.data?.type === 'koharu-cms-result') {
        const pending = pendingSave.current;
        if (
          !pending ||
          event.data.requestId !== pending.requestId ||
          event.data.postId !== pending.postId ||
          current.current.id !== pending.draftId
        )
          return;
        pendingSave.current = null;
        setSaving(false);
        if (typeof event.data.error === 'string' && event.data.error) {
          setError(event.data.error);
          setStatus('当前修改尚未保存到博客');
        } else {
          setStatus(current.current.source === pending.source ? '已保存到博客文件' : '已保存提交时的版本，后续修改仍待保存。');
        }
      }
    };
    window.addEventListener('message', receive);
    // Reloads can change document.referrer to this iframe. Only the non-sensitive ready notice is broadcast;
    // article messages above still require the local CMS origin and the actual parent window.
    if (import.meta.env.DEV && window.parent !== window) window.parent.postMessage({ type: 'koharu-editor-ready' }, '*');
    return () => window.removeEventListener('message', receive);
  }, [ogEndpoint]);

  useEffect(() => {
    if (!initialized) return;
    const persist = () => {
      try {
        const value = draft;
        writeDraft(localStorage, { ...value, title: documentTitle(value.source), updated: Date.now() });
        setDrafts(listDrafts(localStorage));
        setStatus('草稿已保存在此浏览器');
      } catch {
        setError('浏览器存储已满或不可用。当前文章仍在编辑器中，请复制或下载。');
      }
    };
    const timer = window.setTimeout(persist, 600);
    const flush = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', persist);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', persist);
    };
  }, [initialized, draft]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      document.documentElement.style.setProperty('--editor-height', `${viewport?.height ?? window.innerHeight}px`);
      document.documentElement.style.setProperty('--editor-offset-top', `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      document.documentElement.style.removeProperty('--editor-height');
      document.documentElement.style.removeProperty('--editor-offset-top');
    };
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (panel && node && !node.open) {
      cancelSheetMotion(node);
      node.showModal();
      playSheetEnter(node);
    }
    if (panel === 'copy') {
      copySource.current?.focus({ preventScroll: true });
      copySource.current?.select();
    }
  }, [panel]);

  const closePanel = (restoreFocus = true) => {
    const node = dialog.current;
    // Commit property fields before WebKit dismisses the dialog without firing blur.
    if (document.activeElement instanceof HTMLElement && node?.contains(document.activeElement)) document.activeElement.blur();
    setPanel(null);
    // Close first so the page is interactive (and insertable) at once; the sheet animates out as a visual only.
    if (node?.open) {
      node.close();
      void playSheetExit(node);
    }
    if (restoreFocus) requestAnimationFrame(() => panelTrigger.current?.focus({ preventScroll: true }));
  };
  const openPanel = (name: Exclude<Panel, null>, trigger?: HTMLElement) => {
    if (panel === name) {
      closePanel();
      return;
    }
    panelTrigger.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPanelSession((value) => value + 1);
    setPanel(name);
  };

  const flushDraft = () => {
    try {
      writeDraft(localStorage, { ...current.current, title: documentTitle(current.current.source), updated: Date.now() });
      return true;
    } catch {
      setError('无法保存当前草稿，请先复制或下载再切换文章。');
      return false;
    }
  };
  const detachCMS = () => {
    if (cms) window.parent.postMessage({ type: 'koharu-cms-detach', postId: cms.postId }, cms.origin);
    pendingSave.current = null;
    setCMS(null);
    setSaving(false);
  };
  const activate = (value: EditorDraft) => {
    if (value.id === current.current.id) {
      closePanel();
      return;
    }
    if (!flushDraft()) return;
    editor.current?.saveHistory();
    detachCMS();
    setDraft(value);
    setError('');
    closePanel(false);
  };
  const activateLatest = useRef(activate);
  activateLatest.current = activate;
  importFromBlog.current = async (path: string) => {
    setImportFailure(null);
    setImporting(true);
    setStatus('正在从博客导入原文…');
    try {
      const source = await fetchMarkdownSource(path);
      const imported = createDraft(source, importFilename(path), path);
      if (current.current === starterDraft.current) {
        // A first visit's blank starter was never edited; replace it rather than leave an empty draft behind.
        try {
          removeDraft(localStorage, starterDraft.current.id);
        } catch {
          // The starter may never have been stored.
        }
        current.current = imported;
        setDraft(imported);
      } else activateLatest.current(imported);
      setStatus('已导入博客原文，修改只保存在此浏览器');
    } catch (failure) {
      setStatus('');
      setImportFailure({ path, message: failure instanceof Error ? failure.message : '原文导入失败，请重试。' });
    } finally {
      setImporting(false);
    }
  };
  const continueImported = (summary: DraftSummary) => {
    const value = readDraft(localStorage, summary.id);
    if (!value) {
      setError('之前导入的草稿不存在或已损坏，可以重新导入。');
      return;
    }
    activate(value);
    setStatus('已打开之前导入的草稿');
  };
  const insert = (source: string) => {
    closePanel(false);
    setTab('edit');
    requestAnimationFrame(() => {
      if (editor.current?.insert(source)) setError('');
      else setError('请将所有选区放在正文中再插入模板，文章属性请在属性面板中编辑。');
    });
  };
  const format = (action: EditorFormat) => {
    setTab('edit');
    const apply = () => {
      if (editor.current?.format(action)) setError('');
      else setError('当前选区无法安全应用此格式，请重新选择正文文字；文章属性请在属性面板中编辑。');
    };
    if (tab === 'edit') apply();
    else requestAnimationFrame(apply);
  };
  const editSource = (edit: (source: string) => string) => {
    try {
      const valueAfterEdit = { ...current.current, source: edit(current.current.source) };
      current.current = valueAfterEdit;
      setDraft(valueAfterEdit);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '无法更新文章属性');
    }
  };
  const setProperty = (key: string, value: unknown) => editSource((source) => updateEditorProperty(source, key, value));
  const setListProperty = (key: string, edit: ListEdit) => editSource((source) => updateEditorList(source, key, edit));

  const changePreviewService = (endpoint: string | null) => {
    let persisted = true;
    try {
      saveOGEndpoint(localStorage, endpoint);
    } catch {
      persisted = false;
    }
    setPreviewEndpoint(endpoint ?? ogEndpoint);
    closePanel();
    setStatus(persisted ? '已切换链接预览服务' : '已切换本次预览服务，浏览器无法保存此设置');
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([draft.source], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = draft.filename?.split('/').pop() || markdownFilename(draft.source);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('已下载完整 Markdown');
  };
  const copy = async (trigger?: HTMLElement) => {
    setError('');
    if (await copyMarkdown(current.current.source)) setStatus('已复制完整 Markdown');
    else {
      setStatus('请在原文选区中选择复制');
      if (panel !== 'copy') openPanel('copy', trigger);
      else {
        copySource.current?.focus({ preventScroll: true });
        copySource.current?.select();
      }
    }
  };
  const saveCMS = () => {
    if (!cms || pendingSave.current) return;
    const { id: draftId, source } = current.current;
    const requestId = crypto.randomUUID();
    pendingSave.current = { requestId, draftId, postId: cms.postId, source };
    setSaving(true);
    setStatus('正在保存到博客…');
    setError('');
    window.parent.postMessage({ type: 'koharu-cms-save', postId: cms.postId, requestId, source }, cms.origin);
  };
  const loadExample = async () => {
    const { default: source } = await import('./shoka-example.md?raw');
    activate(createDraft(source, 'shoka-features.md'));
  };

  const action = (name: string, label: string, onClick: (event: MouseEvent<HTMLButtonElement>) => void, extra = '') => (
    <button type="button" className={`editor-button ${extra}`} onClick={onClick} title={label} aria-label={label}>
      <EditorIcon name={name} />
      <span>{label}</span>
    </button>
  );
  const iconAction = (name: string, label: string, onClick: () => void) => (
    <button type="button" className="editor-icon-button" onClick={onClick} title={label} aria-label={label}>
      <EditorIcon name={name} />
    </button>
  );

  return (
    <div
      className={`editor-workspace ${focus ? 'editor-focus' : ''}`}
      data-tab={tab}
      style={{ '--editor-split': `${split}%` } as CSSProperties}
    >
      <header className="editor-header">
        <a className="editor-brand" href="/" title="返回博客">
          <span>Koharu</span>
          <small>写作室</small>
        </a>
        <div className="editor-document-name">
          <strong title={articleTitle}>{articleTitle}</strong>
          <span className="editor-document-meta" title={cms?.postId}>
            {cms && <span className="editor-cms-badge">CMS</span>}
            <output>{status || (cms ? cms.postId : '草稿自动保存在此浏览器')}</output>
          </span>
        </div>
        <div className="editor-header-actions">
          {action('copy', '复制', (event) => {
            void copy(event.currentTarget);
          })}
          {action('download', '下载 MD', download, cms ? '' : 'editor-primary')}
          {cms && (
            <button
              type="button"
              className="editor-button editor-primary"
              aria-label={saving ? '保存中…' : '保存到博客'}
              title="保存到博客"
              onClick={saveCMS}
              disabled={saving}
            >
              <EditorIcon name="save" />
              <span>{saving ? '保存中…' : '保存到博客'}</span>
            </button>
          )}
        </div>
      </header>
      <div className="editor-toolbar">
        <div className="editor-tools">
          {action('draft', '草稿', (event) => openPanel('drafts', event.currentTarget))}
          {iconAction('new', '新建', () => activate(createDraft()))}
          {iconAction('import', '导入', () => importInput.current?.click())}
          <span className="editor-divider" />
          {toolbarFormats.map((id) => {
            const entry = syntaxEntries.find((item) => item.id === id);
            return (
              entry && (
                <button
                  key={id}
                  type="button"
                  className="editor-icon-button"
                  title={entry.label}
                  aria-label={entry.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => format(id)}
                >
                  <EditorIcon name={id} />
                </button>
              )
            );
          })}
          <span className="editor-divider" />
          {iconAction('undo', '撤销', () => editor.current?.undo())}
          {iconAction('redo', '重做', () => editor.current?.redo())}
          <span className="editor-divider editor-view-tools" />
          {action('help', '语法手册', (event) => openPanel('syntax', event.currentTarget), 'editor-view-tools')}
        </div>
        <div className="editor-tools editor-view-tools">
          {action('settings', '文章属性', (event) => openPanel('properties', event.currentTarget))}
          <button
            type="button"
            className="editor-button"
            aria-label={focus ? '退出专注' : '专注'}
            aria-pressed={focus}
            onClick={() => setFocus(!focus)}
          >
            <EditorIcon name="focus" />
            <span>{focus ? '退出专注' : '专注'}</span>
          </button>
        </div>
      </div>
      {error && (
        <div className="editor-error" role="alert">
          <p>{error}</p>
          <button type="button" className="editor-icon-button" aria-label="关闭提示" onClick={() => setError('')}>
            <EditorIcon name="close" />
          </button>
        </div>
      )}
      {importFailure && (
        <div className="editor-error" role="alert">
          <p>{importFailure.message}</p>
          <button
            type="button"
            className="editor-button"
            disabled={importing}
            onClick={() => {
              void importFromBlog.current(importFailure.path);
            }}
          >
            {importing ? '导入中…' : '重试'}
          </button>
          <button type="button" className="editor-icon-button" aria-label="关闭提示" onClick={() => setImportFailure(null)}>
            <EditorIcon name="close" />
          </button>
        </div>
      )}
      <div className="editor-panes">
        <section className="editor-source-pane" aria-label="源码编辑区">
          <div className="editor-pane-heading">
            <span>Markdown</span>
            <small className="editor-cursor">
              第 {cursor.line} 行 · 第 {cursor.column} 列
            </small>
          </div>
          <CodeEditor
            ref={editor}
            source={draft.source}
            draftId={draft.id}
            onSelectionChange={setCursor}
            onChange={(source) => setDraft((previous) => ({ ...previous, source }))}
          />
        </section>
        <div className="editor-resizer">
          <input
            type="range"
            min="28"
            max="72"
            value={split}
            onChange={(event) => setSplit(Number(event.target.value))}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const bounds = event.currentTarget.closest('.editor-panes')?.getBoundingClientRect();
              if (!bounds?.width) return;
              event.preventDefault();
              resizeStart.current = { x: event.clientX, split, width: bounds.width };
              event.currentTarget.focus({ preventScroll: true });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const start = resizeStart.current;
              if (start) setSplit(Math.max(28, Math.min(72, start.split + ((event.clientX - start.x) / start.width) * 100)));
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              resizeStart.current = null;
            }}
            onPointerCancel={() => {
              resizeStart.current = null;
            }}
            aria-label="调整源码与预览宽度"
            aria-valuetext={`源码 ${Math.round(split)}%，预览 ${Math.round(100 - split)}%`}
          />
        </div>
        <section className="editor-preview-pane" aria-label="实时预览区">
          <div className="editor-pane-heading">
            <div className="editor-preview-tools">
              <span>实时预览</span>
              <button
                type="button"
                className="editor-icon-button"
                aria-label="链接预览服务"
                title="链接预览服务"
                onClick={(event) => openPanel('service', event.currentTarget)}
              >
                <EditorIcon name="service" />
              </button>
            </div>
            <ViewSwitch
              label="预览范围"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'body', label: '正文' },
                { value: 'article', label: '完整文章' },
              ]}
            />
          </div>
          <PreviewFrame source={draft.source} mode={mode} ogEndpoint={previewEndpoint} />
        </section>
      </div>
      <footer className="editor-status">
        <span>{draft.source.length.toLocaleString()} 字符</span>
        <a href="/post/note/shoka-features" target="_blank" rel="noreferrer">
          Shoka 语法演示
          <EditorIcon name="external" />
        </a>
      </footer>
      <nav className="editor-mobile-tabs" aria-label="写作室导航">
        <ViewSwitch
          label="编辑与预览"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'edit', label: '编辑', icon: 'edit' },
            { value: 'preview', label: '预览', icon: 'preview' },
          ]}
        />
        <button type="button" className="editor-tab-button" onClick={(event) => openPanel('syntax', event.currentTarget)}>
          <EditorIcon name="help" />
          <span>语法</span>
        </button>
        <button type="button" className="editor-tab-button" onClick={(event) => openPanel('properties', event.currentTarget)}>
          <EditorIcon name="settings" />
          <span>属性</span>
        </button>
      </nav>
      <input
        ref={importInput}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (file.size > MAX_MARKDOWN_BYTES) setError('请导入小于 5 MB 的 Markdown 文件');
            else {
              try {
                const source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
                activate(createDraft(source, file.name));
              } catch {
                setError('文件无法读取，请使用 UTF-8 编码的 Markdown 文件。');
              }
            }
          }
          event.target.value = '';
        }}
      />
      {shownPanel && (
        <dialog
          ref={dialog}
          className="editor-panel-backdrop"
          aria-label={
            shownPanel === 'syntax'
              ? '语法手册'
              : shownPanel === 'drafts'
                ? '浏览器草稿'
                : shownPanel === 'copy'
                  ? '复制 Markdown'
                  : shownPanel === 'service'
                    ? '链接预览服务'
                    : shownPanel === 'import'
                      ? '已有导入的草稿'
                      : '文章属性'
          }
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closePanel();
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            closePanel();
          }}
          onClose={() => setPanel(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget || event.target === event.currentTarget.firstElementChild) closePanel();
          }}
        >
          <div className="editor-panel-scrim" />
          <aside className="editor-panel">
            <SheetHandle onDismiss={() => closePanel()} />
            <div className="editor-panel-body" key={panelSession}>
              {shownPanel === 'syntax' ? (
                <SyntaxPanel
                  onInsert={insert}
                  onClose={() => closePanel()}
                  renderExample={(source) => <PreviewFrame source={source} example ogEndpoint={previewEndpoint} />}
                />
              ) : (
                <>
                  <div className="editor-panel-header">
                    <h2>
                      {shownPanel === 'drafts'
                        ? '你的草稿'
                        : shownPanel === 'copy'
                          ? '复制 Markdown'
                          : shownPanel === 'service'
                            ? '链接预览服务'
                            : shownPanel === 'import'
                              ? '已有导入的草稿'
                              : '文章属性'}
                    </h2>
                    <button type="button" className="editor-icon-button" aria-label="关闭面板" onClick={() => closePanel()}>
                      <EditorIcon name="close" />
                    </button>
                  </div>
                  {shownPanel === 'drafts' ? (
                    <div className="editor-panel-content">
                      <p className="editor-muted">草稿只保存在当前浏览器，下载 Markdown 即可带走完整原文。</p>
                      <div className="editor-draft-actions">
                        {action('new', '新建文章', () => activate(createDraft()), 'editor-soft')}
                        {action('sample', '载入 Shoka 示例', () => {
                          void loadExample();
                        })}
                      </div>
                      {drafts.map((entry) => (
                        <div key={entry.id} className="editor-draft-row" data-current={entry.id === draft.id}>
                          <button
                            type="button"
                            onClick={() => {
                              const value = readDraft(localStorage, entry.id);
                              if (value) activate(value);
                              else setError('草稿不存在或已损坏，请检查本地备份。');
                            }}
                          >
                            <strong>{entry.title}</strong>
                            <small>
                              {entry.id === draft.id && <span className="editor-draft-current">正在编辑</span>}
                              {entry.importedFrom && <span title={entry.importedFrom}>博客原文副本</span>}
                              {formatDraftTime(entry.updated)}
                            </small>
                          </button>
                          <button
                            type="button"
                            className="editor-icon-button editor-danger"
                            title="删除草稿"
                            aria-label={`删除草稿 ${entry.title}`}
                            onClick={() => {
                              if (!window.confirm(`删除「${entry.title}」的浏览器草稿？`)) return;
                              try {
                                removeDraft(localStorage, entry.id);
                                try {
                                  clearEditorHistory(sessionStorage, entry.id);
                                } catch {
                                  // Browser restrictions can block access to optional history storage.
                                }
                                setDrafts(listDrafts(localStorage));
                                if (entry.id === draft.id) {
                                  detachCMS();
                                  setError('');
                                  setDraft(createDraft());
                                }
                              } catch {
                                setError('无法删除草稿');
                              }
                            }}
                          >
                            <EditorIcon name="delete" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : shownPanel === 'copy' ? (
                    <div className="editor-panel-content">
                      <p className="editor-muted">浏览器未允许自动复制。下方已选中完整原文，可长按选区选择「复制」。</p>
                      <textarea
                        ref={copySource}
                        className="editor-copy-source"
                        aria-label="完整 Markdown 原文"
                        value={draft.source}
                        readOnly
                        spellCheck={false}
                      />
                      <div className="editor-copy-actions">
                        {action('copy', '全选原文', () => {
                          copySource.current?.focus({ preventScroll: true });
                          copySource.current?.select();
                        })}
                        {action('copy', '再次复制', () => {
                          void copy();
                        })}
                        {action('download', '下载 MD', download, 'editor-primary')}
                      </div>
                    </div>
                  ) : shownPanel === 'import' && importOffer ? (
                    <div className="editor-panel-content">
                      <p className="editor-muted">
                        这篇文章之前导入过，浏览器里还有那份草稿。重新导入会另存一份博客当前的原文，旧草稿仍保留在「草稿」里。
                      </p>
                      <div className="editor-draft-row editor-import-draft" title={importOffer.path}>
                        <strong>{importOffer.draft.title}</strong>
                        <small>上次编辑 {formatDraftTime(importOffer.draft.updated)}</small>
                      </div>
                      <div className="editor-copy-actions">
                        {action('draft', '继续编辑草稿', () => continueImported(importOffer.draft), 'editor-primary')}
                        {action('import', '重新导入', () => {
                          closePanel(false);
                          void importFromBlog.current(importOffer.path);
                        })}
                      </div>
                    </div>
                  ) : shownPanel === 'service' ? (
                    <LinkPreviewSettings
                      endpoint={previewEndpoint}
                      defaultEndpoint={ogEndpoint}
                      onChange={changePreviewService}
                    />
                  ) : (
                    <ArticleProperties
                      data={parsed.data}
                      error={parsed.error}
                      colophon={colophon}
                      onChange={setProperty}
                      onListChange={setListProperty}
                    />
                  )}
                </>
              )}
            </div>
          </aside>
        </dialog>
      )}
    </div>
  );
}
