import { type ReactNode, useId, useState } from 'react';
import { syntaxEntries } from '../syntax';
import EditorIcon from './EditorIcon';

type SyntaxPanelProps = {
  onInsert: (source: string) => void;
  onClose: () => void;
  renderExample?: (source: string) => ReactNode;
};

const categories = ['全部', ...new Set(syntaxEntries.map((entry) => entry.category))];

export default function SyntaxPanel({ onInsert, onClose, renderExample }: SyntaxPanelProps) {
  const panelId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [insertedLabel, setInsertedLabel] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const entries = syntaxEntries.filter(
    (entry) =>
      (category === '全部' || entry.category === category) &&
      `${entry.label} ${entry.description} ${entry.source} ${entry.notes?.join(' ') ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
  );

  return (
    <section className="editor-syntax-panel" aria-labelledby={`${panelId}-title`}>
      <header className="editor-panel-header">
        <div>
          <p className="editor-eyebrow">写作参考</p>
          <h2 id={`${panelId}-title`}>语法手册</h2>
        </div>
        <button type="button" className="editor-icon-button" onClick={onClose} aria-label="关闭语法手册">
          <EditorIcon name="close" />
        </button>
      </header>
      <p className="editor-panel-intro">找到一种表达方式，展开查看用法，再把模板插入文章。</p>
      <div className="editor-syntax-filters">
        <label className="editor-syntax-search">
          <EditorIcon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索语法、效果或参数"
            aria-label="搜索语法手册"
          />
        </label>
        <label className="editor-syntax-category">
          <span>分类</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <output className="editor-syntax-count">找到 {entries.length} 项语法</output>
      <div className="editor-syntax-list">
        {entries.map((entry) => {
          const expanded = expandedId === entry.id;
          const detailsId = `${panelId}-${entry.id}`;
          const isMetadata = entry.id === 'frontmatter' || entry.id === 'encryptedpost';
          return (
            <article className="editor-syntax-item" key={entry.id} data-expanded={expanded}>
              <h3 className="editor-syntax-heading">
                <button
                  type="button"
                  className="editor-syntax-toggle"
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                >
                  <EditorIcon name={entry.id} />
                  <span>{entry.label}</span>
                  <EditorIcon name="chevron" className="editor-syntax-chevron" />
                </button>
              </h3>
              <div id={detailsId} hidden={!expanded} className="editor-syntax-detail">
                {expanded && (
                  <>
                    <p>{entry.description}</p>
                    <pre className="editor-syntax-source">
                      <code>{entry.source}</code>
                    </pre>
                    {entry.notes && (
                      <ul className="editor-syntax-notes">
                        {entry.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                    {renderExample && !isMetadata && (
                      <div className="editor-syntax-example">
                        <h4>实际效果</h4>
                        {renderExample(entry.source)}
                      </div>
                    )}
                    {!isMetadata && (
                      <button
                        type="button"
                        className="editor-button editor-syntax-insert"
                        onClick={() => {
                          onInsert(entry.source);
                          setInsertedLabel(`已插入「${entry.label}」模板`);
                        }}
                      >
                        <EditorIcon name="new" />
                        插入模板
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
        {entries.length === 0 && <p className="editor-empty-state">没有找到匹配的语法，试试其他词语或选择“全部”分类。</p>}
      </div>
      <output className="editor-syntax-feedback" aria-live="polite">
        {insertedLabel}
      </output>
    </section>
  );
}
