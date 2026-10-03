import { isMap, parseDocument } from 'yaml';

export interface EditorDocument {
  body: string;
  data: Record<string, unknown>;
  error?: string;
}

const frontmatterPattern = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseEditorDocument(source: string): EditorDocument {
  const match = frontmatterPattern.exec(source);
  if (!match) return { body: source, data: {} };
  const body = source.slice(match[0].length);
  try {
    const document = parseDocument(match[1]);
    if (document.errors.length) throw document.errors[0];
    if (!isMap(document.contents) && document.contents !== null) throw new Error('文章属性必须是 YAML 键值对');
    return { body, data: document.toJS() ?? {} };
  } catch (error) {
    return { body, data: {}, error: error instanceof Error ? error.message : '文章属性格式有误' };
  }
}

export function updateEditorProperty(source: string, key: string, value: unknown): string {
  const match = frontmatterPattern.exec(source);
  const document = parseDocument(match?.[1] ?? '');
  if (document.errors.length) throw new Error('请先修正源码中的 YAML 格式，再编辑文章属性');
  if (value === undefined || value === '') document.delete(key);
  else document.set(key, value);
  const newline = match?.[0].includes('\r\n') ? '\r\n' : '\n';
  const yaml = document.toString().trimEnd().replace(/\r?\n/g, newline);
  const bom = source.startsWith('\uFEFF') ? '\uFEFF' : '';
  return `${bom}---${newline}${yaml}${newline}---${newline}${match ? source.slice(match[0].length) : source.replace(/^\uFEFF/, '')}`;
}

export function documentTitle(source: string): string {
  const data = parseEditorDocument(source).data;
  return typeof data.title === 'string' && data.title.trim() ? data.title : '未命名文章';
}

export function createEditorSource(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 12:00:00`;
  return `---\ntitle: 新的一篇\ndate: ${date}\ntags: []\ncategories: []\ndraft: true\n---\n\n# 从这里开始\n\n写下你的想法。右侧是博客实际的排版，手机上可以切换到预览。\n\n:::info\n打开「语法手册」，试试提醒块、标签卡、公式和更多 Shoka 语法。\n:::\n`;
}

export function markdownFilename(source: string): string {
  const title = documentTitle(source)
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();
  return `${title || 'untitled'}.md`;
}
