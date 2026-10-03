import { type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { copyMarkdown } from './clipboard';
import ArticleProperties from './components/ArticleProperties';
import CodeEditor, { type CodeEditorHandle } from './components/CodeEditor';
import EditorIcon from './components/EditorIcon';
import LinkPreviewSettings from './components/LinkPreviewSettings';
import PreviewFrame from './components/PreviewFrame';
import SyntaxPanel from './components/SyntaxPanel';
import { createEditorSource, documentTitle, markdownFilename, parseEditorDocument, updateEditorProperty } from './document';
import { clearEditorHistory } from './editor-history';
import { type EditorFormat, toolbarFormats } from './formatting';
import { readOGEndpoint, saveOGEndpoint } from './link-service';
import { activeDraft, type DraftSummary, type EditorDraft, listDrafts, readDraft, removeDraft, writeDraft } from './storage';
import { syntaxEntries } from './syntax';

type Panel = 'drafts' | 'syntax' | 'properties' | 'copy' | 'service' | null;
interface Props {
  ogEndpoint?: string;
}

function createDraft(source = createEditorSource(), filename?: string): EditorDraft {
  return { id: crypto.randomUUID(), title: documentTitle(source), source, updated: Date.now(), filename };
}

export default function Editor({ ogEndpoint = '/api/editor/og' }: Props) {
  const [previewEndpoint, setPreviewEndpoint] = useState(ogEndpoint);
  const [draft, setDraft] = useState<EditorDraft>(() => createDraft());
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [mode, setMode] = useState<'body' | 'article'>('body');
  const [focus, setFocus] = useState(false);
  const [split, setSplit] = useState(50);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [cms, setCMS] = useState<{ origin: string; postId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const editor = useRef<CodeEditorHandle>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const panelTrigger = useRef<HTMLElement | null>(null);
  const copySource = useRef<HTMLTextAreaElement>(null);
  const current = useRef(draft);
  current.current = draft;
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
        setSaving(false);
        if (event.data.error) setError(event.data.error);
        else setStatus('已保存到博客文件');
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
    if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (panel === 'copy') {
      copySource.current?.focus({ preventScroll: true });
      copySource.current?.select();
    }
  }, [panel]);

  const closePanel = (restoreFocus = true) => {
    // Commit property fields before WebKit dismisses the dialog without firing blur.
    if (document.activeElement instanceof HTMLElement && dialog.current?.contains(document.activeElement))
      document.activeElement.blur();
    dialog.current?.close();
    setPanel(null);
    if (restoreFocus) requestAnimationFrame(() => panelTrigger.current?.focus({ preventScroll: true }));
  };
  const openPanel = (name: Exclude<Panel, null>, trigger?: HTMLElement) => {
    if (panel === name) {
      closePanel();
      return;
    }
    panelTrigger.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
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
  const setProperty = (key: string, value: unknown) => {
    try {
      const valueAfterEdit = { ...current.current, source: updateEditorProperty(current.current.source, key, value) };
      current.current = valueAfterEdit;
      setDraft(valueAfterEdit);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '无法更新文章属性');
    }
  };

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
    if (!cms || saving) return;
    setSaving(true);
    setStatus('正在保存到博客…');
    setError('');
    window.parent.postMessage({ type: 'koharu-cms-save', postId: cms.postId, source: draft.source }, cms.origin);
  };
  const loadExample = async () => {
    const { default: source } = await import('../../content/blog/note/shoka-features.md?raw');
    activate(createDraft(source, 'shoka-features.md'));
  };

  const action = (name: string, label: string, onClick: (event: MouseEvent<HTMLButtonElement>) => void, extra = '') => (
    <button type="button" className={`editor-button ${extra}`} onClick={onClick} title={label} aria-label={label}>
      <EditorIcon name={name} />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      className={`editor-workspace ${focus ? 'editor-focus' : ''}`}
      data-tab={tab}
      style={{ '--editor-split': `${split}%` } as CSSProperties}
    >
      <header className="editor-header">
        <a className="editor-brand" href="/">
          <span>Koharu</span>
          <small>写作室</small>
        </a>
        <div className="editor-document-name">
          <strong title={articleTitle}>{articleTitle}</strong>
          <span className={cms ? 'editor-cms-context' : undefined} title={cms?.postId}>
            {cms ? (
              <>
                CMS<span className="editor-cms-filename"> · {cms.postId}</span>
              </>
            ) : (
              '只保存在你的浏览器'
            )}
          </span>
        </div>
        <div className="editor-header-actions">
          {action('copy', '复制', (event) => {
            void copy(event.currentTarget);
          })}
          {action('download', '下载 MD', download, 'editor-primary')}
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
          {action('new', '新建', () => activate(createDraft()))}
          {action('import', '导入', () => importInput.current?.click())}
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
          {action('help', '语法手册', (event) => openPanel('syntax', event.currentTarget))}
          {action('undo', '撤销', () => editor.current?.undo())}
          {action('redo', '重做', () => editor.current?.redo())}
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
            <EditorIcon name="edit" />
            <span>{focus ? '退出专注' : '专注'}</span>
          </button>
        </div>
      </div>
      {error && (
        <div className="editor-error" role="alert">
          {error}
          <button type="button" aria-label="关闭提示" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      <div className="editor-panes">
        <section className="editor-source-pane" aria-label="源码编辑区">
          <div className="editor-pane-heading">
            <span>Markdown</span>
            <small>
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
            aria-label="调整源码与预览宽度"
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
                <EditorIcon name="link" />
              </button>
            </div>
            <div className="editor-segmented">
              <button type="button" aria-pressed={mode === 'body'} onClick={() => setMode('body')}>
                正文
              </button>
              <button type="button" aria-pressed={mode === 'article'} onClick={() => setMode('article')}>
                完整文章
              </button>
            </div>
          </div>
          <PreviewFrame source={draft.source} mode={mode} ogEndpoint={previewEndpoint} />
        </section>
      </div>
      <footer className="editor-status">
        <output>{status || '草稿会自动保存在此浏览器'}</output>
        <span className="editor-toolbar-hint">工具栏可横滑</span>
        <span>{draft.source.length.toLocaleString()} 字符</span>
        <a href="/post/note/shoka-features" target="_blank" rel="noreferrer">
          Shoka 语法演示 ↗
        </a>
      </footer>
      <nav className="editor-mobile-tabs" aria-label="编辑与预览">
        <button type="button" aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>
          <EditorIcon name="edit" />
          编辑
        </button>
        <button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>
          <EditorIcon name="preview" />
          预览
        </button>
        <button type="button" onClick={(event) => openPanel('syntax', event.currentTarget)}>
          <EditorIcon name="help" />
          语法
        </button>
        <button type="button" onClick={(event) => openPanel('properties', event.currentTarget)}>
          <EditorIcon name="settings" />
          属性
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
            if (file.size > 5 * 1024 * 1024) setError('请导入小于 5 MB 的 Markdown 文件');
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
      {panel && (
        <dialog
          ref={dialog}
          className="editor-panel-backdrop"
          aria-label={
            panel === 'syntax'
              ? '语法手册'
              : panel === 'drafts'
                ? '浏览器草稿'
                : panel === 'copy'
                  ? '复制 Markdown'
                  : panel === 'service'
                    ? '链接预览服务'
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
            if (event.target === event.currentTarget) closePanel();
          }}
        >
          <aside className="editor-panel">
            {panel === 'syntax' ? (
              <SyntaxPanel
                onInsert={insert}
                onClose={() => closePanel()}
                renderExample={(source) => <PreviewFrame source={source} example ogEndpoint={previewEndpoint} />}
              />
            ) : (
              <>
                <div className="editor-panel-header">
                  <h2>
                    {panel === 'drafts'
                      ? '你的草稿'
                      : panel === 'copy'
                        ? '复制 Markdown'
                        : panel === 'service'
                          ? '链接预览服务'
                          : '文章属性'}
                  </h2>
                  <button type="button" className="editor-icon-button" aria-label="关闭面板" onClick={() => closePanel()}>
                    <EditorIcon name="close" />
                  </button>
                </div>
                {panel === 'drafts' ? (
                  <div className="editor-panel-content">
                    <p className="editor-muted">这些草稿只存在当前浏览器，下载 Markdown 可以带走完整原文。</p>
                    <div className="editor-draft-actions">
                      {action('new', '新建文章', () => activate(createDraft()))}
                      {action('help', '载入 Shoka 示例', () => {
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
                            {entry.id === draft.id ? '当前文章 · ' : ''}
                            {new Date(entry.updated).toLocaleString()}
                          </small>
                        </button>
                        <button
                          type="button"
                          className="editor-icon-button"
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
                ) : panel === 'copy' ? (
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
                ) : panel === 'service' ? (
                  <LinkPreviewSettings
                    endpoint={previewEndpoint}
                    defaultEndpoint={ogEndpoint}
                    onChange={changePreviewService}
                  />
                ) : (
                  <ArticleProperties data={parsed.data} error={parsed.error} onChange={setProperty} />
                )}
              </>
            )}
          </aside>
        </dialog>
      )}
    </div>
  );
}
