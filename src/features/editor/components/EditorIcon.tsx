import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  paragraph: 'M14 3v18M19 3v18M21 3H9a5 5 0 0 0 0 10h5',
  footnote: 'M3 6h10M3 11h10M3 16h7M16 4l4 4m0-4-4 4M13 21h8',
  draft: 'M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h4',
  new: 'M12 5v14M5 12h14',
  import: 'M5 15v5h14v-5M12 3v12m-4-4 4 4 4-4',
  download: 'M4 17v4h16v-4M12 3v12m-4-4 4 4 4-4',
  copy: 'M8 8h12v13H8V8ZM16 8V3H3v13h5',
  save: 'M4 3h13l3 3v15H4V3Zm4 0v6h8V3M8 21v-8h8v8',
  delete: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  close: 'm6 6 12 12M18 6 6 18',
  help: 'M8 8a4 4 0 0 1 8 0c0 3-4 3-4 6M12 18v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  preview: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  edit: 'm4 16 11-11 4 4L8 20l-5 1 1-5Zm8-8 4 4',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  undo: 'm8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12',
  redo: 'm16 5 5 5-5 5M21 10H10a6 6 0 0 0 0 12',
  link: 'm10 8 3-3a4 4 0 0 1 6 6l-3 3M14 16l-3 3a4 4 0 0 1-6-6l3-3m1 5 6-6',
  image: 'M3 4h18v16H3V4Zm0 12 5-5 5 5 3-3 5 5M17 8h.01',
  chevron: 'm6 9 6 6 6-6',
  heading: 'M5 4v16M15 4v16M5 12h10M18 15l2-1v6M18 20h4',
  italic: 'M10 4h10M4 20h10M15 4 9 20',
  bold: 'M7 4h6a4 4 0 0 1 0 8H7m0-8v16h7a4 4 0 0 0 0-8h-1',
  strike: 'M17 6c-1-2-3-3-5-3-6 0-7 7-1 9M7 18c1 2 3 3 5 3 6 0 7-7 1-9M3 12h18',
  quote: 'M9 5C5 7 4 10 4 15h6v6H4v-6M20 5c-4 2-5 5-5 10h6v6h-6v-6',
  list: 'M4 5h1M4 12h1M4 19h1M9 5h11M9 12h11M9 19h11',
  task: 'M3 4h7v7H3V4Zm2 3 1 1 3-3M14 7h7M3 15h7v7H3v-7M14 18h7',
  table: 'M3 4h18v16H3V4Zm0 5h18M3 14h18M10 4v16',
  divider: 'M3 12h18M10 4h4M10 20h4',
  embed: 'M4 3h16v18H4V3Zm4 4h8v5H8V7Zm0 9h8M8 18h5',
  audio: 'M9 18V5l11-2v13M9 9l11-2M9 18c0 4-7 4-7 0s7-4 7 0Zm11-2c0 4-7 4-7 0s7-4 7 0Z',
  playlist: 'M3 5h11M3 10h9M3 15h7M17 18V7l4-1M17 18c0 4-7 4-7 0s7-4 7 0Z',
  video: 'M3 5h18v14H3V5Zm6 3 7 4-7 4V8Z',
  friend: 'M3 4h18v16H3V4Zm8 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5 16c0-5 8-5 8 0M15 9h3M15 13h3',
  underline: 'M6 3v9a6 6 0 0 0 12 0V3M4 21h16',
  highlight: 'm7 15 9-12 5 4-9 12-5-4Zm0 0-3 5h6M3 22h18',
  subscript: 'm4 4 9 11M13 4 4 15M16 16c0-4 5-4 5-1 0 2-5 3-5 6h5',
  color: 'm5 17 7-14 7 14M8 12h8M4 21h16',
  keyboard: 'M2 6h20v12H2V6Zm4 4h1M11 10h1M16 10h1M7 14h10',
  label: 'M3 4h8l10 10-7 7L3 10V4Zm4 3h.01',
  attrs: 'M8 3C3 3 7 10 3 12c4 2 0 9 5 9M16 3c5 0 1 7 5 9-4 2 0 9-5 9M10 9h4M10 15h4',
  spoiler: 'M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6ZM3 3l18 18',
  ruby: 'M5 3h4M15 3h4M4 9h16M8 9v4c0 4-2 6-4 8M16 9v12M8 15h8',
  note: 'M3 4h18v16H3V4ZM8 8v5M8 16v.01M12 9h5M12 14h5',
  collapse: 'M3 4h18v16H3V4Zm0 6h18M7 6l2 2 2-2M7 15h10',
  tabs: 'M3 8V4h7v4h11v13H3V8Zm7-4h5v4M15 4h6v4M3 8h7M7 13h10M7 17h7',
  quiz: 'M3 4h18v17H3V4Zm4 5h2M13 9h4M6 15l2 2 3-4M14 15h3',
  truefalse: 'm3 7 3 3 5-6m3 10 7 7m0-7-7 7M12 3v18',
  fill: 'M3 6h18M3 12h5m0-2v4h8v-4m0 2h5M3 18h18',
  encrypted: 'M5 10h14v11H5V10Zm3 0V7a4 4 0 0 1 8 0v3M12 14v3',
  encryptedpost: 'M4 3h11l5 5v5M15 3v5h5M4 3v18h5M13 15h8v7h-8v-7Zm2 0v-2a2 2 0 0 1 4 0v2',
  code: 'm7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18',
  codemeta: 'M3 3h18v18H3V3Zm0 5h18M6 5h.01M9 5h.01M7 12l-2 3 2 3m10-6 2 3-2 3M13 11l-2 8',
  formula: 'M19 4H6l7 8-7 8h13M3 4h.01',
  mermaid: 'M8 3h8v5H8V3Zm-6 13h8v5H2v-5Zm12 0h8v5h-8v-5ZM12 8v4M6 16v-4h12v4',
  infographic: 'M4 21V9h4v12M10 21V3h4v18M16 21V13h4v8M2 21h20',
  frontmatter: 'M4 3h16v18H4V3Zm4 5h2M13 8h3M8 12h2M13 12h3M8 16h2M13 16h3',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 6 6',
};

type EditorIconProps = SVGProps<SVGSVGElement> & { name: string; title?: string };

export default function EditorIcon({ name, title, className, style, ...props }: EditorIconProps) {
  const labeled = Boolean(title || props['aria-label'] || props['aria-labelledby']);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={labeled ? 'img' : undefined}
      aria-hidden={labeled ? undefined : true}
      aria-label={title}
      {...props}
      style={{ ...style, fill: 'none', stroke: 'currentColor' }}
    >
      {title && <title>{title}</title>}
      <path d={paths[name] ?? paths.draft} />
    </svg>
  );
}
