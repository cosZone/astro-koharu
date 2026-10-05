import { type ReactNode, useId, useState } from 'react';
import { syntaxEntries } from '../syntax';
import EditorIcon from './EditorIcon';

type SyntaxPanelProps = {
  onInsert: (source: string) => void;
  onClose: () => void;
  renderExample?: (source: string) => ReactNode;
};

const ALL = '全部';
const categories = [...new Set(syntaxEntries.map((entry) => entry.category))];

export default function SyntaxPanel({ onInsert, onClose, renderExample }: SyntaxPanelProps) {
  const panelId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [insertedLabel, setInsertedLabel] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const entries = syntaxEntries.filter(
    (entry) =>
      (category === ALL || entry.category === category) &&
      `${entry.label} ${entry.description} ${entry.source} ${entry.notes?.join(' ') ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
  );
  const groups = categories
    .map((name) => ({ name, items: entries.filter((entry) => entry.category === name) }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="editor-syntax-panel" aria-labelledby={`${panelId}-title`}>
      <header className="editor-panel-header">
        <h2 id={`${panelId}-title`}>语法手册</h2>
        <output className="editor-syntax-count">{entries.length} 项</output>
        <button type="button" className="editor-icon-button" onClick={onClose} aria-label="关闭语法手册">
          <EditorIcon name="close" />
        </button>
      </header>
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
        <fieldset className="editor-chips" aria-label="语法分类">
          {[ALL, ...categories].map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="editor-syntax-list">
        {groups.map((group) => (
          <section key={group.name} className="editor-syntax-group" aria-label={group.name}>
            {category === ALL && (
              <h3 className="editor-syntax-group-title">
                {group.name}
                <span>{group.items.length}</span>
              </h3>
            )}
            {group.items.map((entry) => {
              const expanded = expandedId === entry.id;
              const detailsId = `${panelId}-${entry.id}`;
              const isMetadata = entry.id === 'frontmatter' || entry.id === 'encryptedpost';
              return (
                <article className="editor-syntax-item" key={entry.id} data-expanded={expanded}>
                  <h4 className="editor-syntax-heading">
                    <button
                      type="button"
                      className="editor-syntax-toggle"
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                    >
                      <EditorIcon name={entry.id} className="editor-syntax-icon" />
                      <span className="editor-syntax-label">{entry.label}</span>
                      <span className="editor-syntax-summary">{entry.description}</span>
                      <EditorIcon name="chevron" className="editor-syntax-chevron" />
                    </button>
                  </h4>
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
                            <h5>实际效果</h5>
                            {renderExample(entry.source)}
                          </div>
                        )}
                        {!isMetadata && (
                          <button
                            type="button"
                            className="editor-button editor-primary editor-syntax-insert"
                            onClick={() => {
                              onInsert(entry.source);
                              setInsertedLabel(`已插入「${entry.label}」模板`);
                            }}
                          >
                            <EditorIcon name="new" />
                            <span>插入模板</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
        {entries.length === 0 && <p className="editor-empty-state">没有匹配的语法，换个关键词或回到「全部」分类试试。</p>}
      </div>
      <output className="editor-syntax-feedback" aria-live="polite">
        {insertedLabel}
      </output>
    </section>
  );
}
