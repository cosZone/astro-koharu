import { Switch } from '@components/ui/switch';
import { useEffect, useId, useRef, useState } from 'react';

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
      <span>{name === 'tags' ? '标签' : '分类'}</span>
      <input
        value={input}
        placeholder={name === 'tags' ? 'Astro, 随笔' : '笔记, 前端'}
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

const textFields = {
  title: { label: '标题', placeholder: '文章标题' },
  date: { label: '发布时间', placeholder: '2026-01-01 12:00:00' },
  updated: { label: '更新时间', placeholder: '留空则不显示' },
  cover: { label: '封面网址', placeholder: 'https://…' },
  description: { label: '摘要', placeholder: '显示在文章开头与列表中' },
} as const;

const toggles = {
  draft: { label: '草稿', hint: '构建时不发布这篇文章' },
  catalog: { label: '显示目录', hint: '在侧栏展示文章目录' },
  tocNumbering: { label: '目录编号', hint: '为目录标题自动编号' },
} as const;

export default function ArticleProperties({ data, error, onChange }: Props) {
  const fieldId = useId();
  const textField = (key: keyof typeof textFields) => (
    <label key={key} className="editor-field">
      <span>{textFields[key].label}</span>
      <input
        value={typeof data[key] === 'string' ? data[key] : ''}
        placeholder={textFields[key].placeholder}
        onChange={(event) => onChange(key, event.target.value)}
      />
    </label>
  );
  return (
    <div className="editor-panel-content">
      <p className="editor-muted">与源码中的 YAML 同步；标签与分类用逗号分隔，自定义字段请在源码中编辑。</p>
      {error && <p className="editor-error">{error}</p>}
      {textField('title')}
      <div className="editor-field-row editor-field-stack">
        {textField('date')}
        {textField('updated')}
      </div>
      {textField('description')}
      {textField('cover')}
      <div className="editor-field-row">
        {(['tags', 'categories'] as const).map((key) => (
          <ListProperty key={key} name={key} value={data[key]} onChange={onChange} />
        ))}
      </div>
      <div className="editor-toggle-group">
        {(Object.keys(toggles) as (keyof typeof toggles)[]).map((key) => (
          <div key={key} className="editor-toggle">
            <label htmlFor={`${fieldId}-${key}`}>
              <strong>{toggles[key].label}</strong>
              <small>{toggles[key].hint}</small>
            </label>
            <Switch
              id={`${fieldId}-${key}`}
              checked={key === 'draft' ? data[key] === true : data[key] !== false}
              onCheckedChange={(checked) => onChange(key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
