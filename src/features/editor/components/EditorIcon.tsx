import type { SVGProps } from 'react';
import { type EditorIconName, editorIcons } from './editor-icons';

type EditorIconProps = SVGProps<SVGSVGElement> & { name: string; title?: string };

export default function EditorIcon({ name, title, className, ...props }: EditorIconProps) {
  const labeled = Boolean(title || props['aria-label'] || props['aria-labelledby']);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role={labeled ? 'img' : undefined}
      aria-hidden={labeled ? undefined : true}
      aria-label={title}
      {...props}
    >
      {title && <title>{title}</title>}
      <path d={editorIcons[name as EditorIconName] ?? editorIcons.draft} />
    </svg>
  );
}
