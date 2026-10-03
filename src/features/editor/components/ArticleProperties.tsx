import { useEffect, useRef, useState } from 'react';

interface Props {
  data: Record<string, unknown>;
  error?: string;
  onChange: (key: string, value: unknown) => void;
}

interface ListPropertyProps {
  name: 'tags' | 'categories';
  value: unknown;
  onChange: Props['onChange'];
}

function listPropertyText(value: unknown): string {
  return Array.isArray(value) ? value.flat().join(', ') : '';
}

function ListProperty({ name, value, onChange }: ListPropertyProps) {
  const [input, setInput] = useState(() => listPropertyText(value));
  const dirty = useRef(false);

  useEffect(() => {
    setInput(listPropertyText(value));
    dirty.current = false;
  }, [value]);

  const commit = () => {
    if (!dirty.current) return;
    dirty.current = false;
    const values = input
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    setInput(values.join(', '));
    onChange(name, values);
  };

  return (
    <label className="editor-field">
      <span>{name === 'tags' ? '标签' : '分类'}（以逗号分隔）</span>
      <input
        value={input}
        onChange={(event) => {
          dirty.current = true;
          setInput(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}

export default function ArticleProperties({ data, error, onChange }: Props) {
  return (
    <div className="editor-panel-content">
      <p className="editor-muted">与源码中的 YAML 同步。自定义字段可以直接在源码中编辑。</p>
      {error && <p className="editor-error">{error}</p>}
      {(['title', 'date', 'updated', 'cover', 'description'] as const).map((key) => (
        <label key={key} className="editor-field">
          <span>{{ title: '标题', date: '发布时间', updated: '更新时间', cover: '封面网址', description: '摘要' }[key]}</span>
          <input
            value={typeof data[key] === 'string' ? data[key] : ''}
            onChange={(event) => onChange(key, event.target.value)}
          />
        </label>
      ))}
      {(['tags', 'categories'] as const).map((key) => (
        <ListProperty key={key} name={key} value={data[key]} onChange={onChange} />
      ))}
      {(['draft', 'catalog', 'tocNumbering'] as const).map((key) => (
        <label key={key} className="editor-checkbox">
          <input
            type="checkbox"
            checked={key === 'draft' ? data[key] === true : data[key] !== false}
            onChange={(event) => onChange(key, event.target.checked)}
          />
          <span>{{ draft: '标记为草稿', catalog: '显示目录', tocNumbering: '目录自动编号' }[key]}</span>
        </label>
      ))}
    </div>
  );
}
