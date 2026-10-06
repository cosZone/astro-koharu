import { Switch } from '@components/ui/switch';
import { useEffect, useId, useRef, useState } from 'react';
import {
  colophonEntries,
  colophonEntryId,
  customColophonCount,
  type EditorColophonGroup,
  type EditorColophonIcon,
  selectExclusiveColophon,
  toggleColophonMark,
} from '../colophon';
import type { ListEdit } from '../document';
import ViewSwitch from './ViewSwitch';

interface Props {
  data: Record<string, unknown>;
  error?: string;
  colophon: readonly EditorColophonGroup[];
  onChange: (key: string, value: unknown) => void;
  onListChange: (key: string, edit: ListEdit) => void;
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

function ColophonIcon({ icon }: { icon?: EditorColophonIcon }) {
  if (!icon) return null;
  return (
    <svg
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      aria-hidden="true"
      className="editor-colophon-icon"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: icon bodies come from bundled Iconify sets at build time, never from the article.
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

const noMark = '\u0000none';

interface ColophonPropertyProps {
  value: unknown;
  groups: readonly EditorColophonGroup[];
  onEdit: (edit: ListEdit) => void;
}

function ColophonProperty({ value, groups, onEdit }: ColophonPropertyProps) {
  const selected = new Set(colophonEntries(value).map(colophonEntryId));
  const custom = customColophonCount(value, groups);
  return (
    <fieldset className="editor-colophon">
      <legend>落款</legend>
      {groups.map((group) => {
        if (group.exclusive) {
          const current = group.marks.find((mark) => selected.has(mark.id));
          return (
            <div key={group.id} className="editor-colophon-group">
              <span>{group.label}</span>
              <ViewSwitch
                label={group.label}
                value={current?.id ?? noMark}
                onChange={(id) => onEdit(selectExclusiveColophon(value, group, id === noMark ? null : id))}
                options={[
                  {
                    value: noMark,
                    label: group.defaultLabel ? `默认 · ${group.defaultLabel}` : '不标注',
                    ...(group.defaultLabel ? { title: '不写这一组时，博客按站点默认显示' } : {}),
                  },
                  ...group.marks.map((mark) => ({
                    value: mark.id,
                    label: mark.label,
                    title: mark.description,
                    media: <ColophonIcon icon={mark.icon} />,
                  })),
                ]}
              />
              {current?.description && <small>{current.description}</small>}
            </div>
          );
        }
        return (
          <div key={group.id} className="editor-colophon-group">
            <span>{group.label}</span>
            <fieldset className="editor-chips editor-colophon-chips" aria-label={group.label}>
              {group.marks.map((mark) => (
                <button
                  key={mark.id}
                  type="button"
                  aria-pressed={selected.has(mark.id)}
                  title={mark.description}
                  onClick={() => onEdit(toggleColophonMark(value, mark.id))}
                >
                  <ColophonIcon icon={mark.icon} />
                  {mark.label}
                </button>
              ))}
            </fieldset>
          </div>
        );
      })}
      {custom > 0 && <p className="editor-muted">另有 {custom} 个自定义落款保留在源码中，可直接在 YAML 里修改。</p>}
    </fieldset>
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
  catalog: { label: '计入分类统计', hint: '关闭后不计入分类页的分类树与篇数' },
  tocNumbering: { label: '目录编号', hint: '为目录标题自动编号' },
} as const;

export default function ArticleProperties({ data, error, colophon, onChange, onListChange }: Props) {
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
      {colophon.length > 0 && (
        <ColophonProperty value={data.colophon} groups={colophon} onEdit={(edit) => onListChange('colophon', edit)} />
      )}
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
