import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from '@blocknote/core';
import type { useCreateBlockNote } from '@blocknote/react';

const CODE_BLOCK_LANGUAGES = {
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  tsx: { name: 'TSX' },
  jsx: { name: 'JSX' },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  json: { name: 'JSON' },
  yaml: { name: 'YAML', aliases: ['yml'] },
  markdown: { name: 'Markdown', aliases: ['md'] },
  bash: { name: 'Bash', aliases: ['sh', 'shell'] },
  python: { name: 'Python', aliases: ['py'] },
  go: { name: 'Go' },
  rust: { name: 'Rust', aliases: ['rs'] },
  sql: { name: 'SQL' },
  c: { name: 'C' },
  cpp: { name: 'C++', aliases: ['c++'] },
  java: { name: 'Java' },
  php: { name: 'PHP' },
  ruby: { name: 'Ruby', aliases: ['rb'] },
  swift: { name: 'Swift' },
  kotlin: { name: 'Kotlin', aliases: ['kt'] },
  text: { name: 'Plain Text' },
};

export const postEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({
      indentLineWithTab: true,
      defaultLanguage: 'text',
      supportedLanguages: CODE_BLOCK_LANGUAGES,
    }),
  },
});

export type PostBlockNoteEditor = ReturnType<typeof useCreateBlockNote>;

export async function blocksToMarkdown(editor: PostBlockNoteEditor): Promise<string> {
  return await editor.blocksToMarkdownLossy(editor.document);
}

export async function markdownToBlocks(editor: PostBlockNoteEditor, markdown: string): Promise<void> {
  const blocks = await editor.tryParseMarkdownToBlocks(markdown);
  editor.replaceBlocks(editor.document, blocks);
}
