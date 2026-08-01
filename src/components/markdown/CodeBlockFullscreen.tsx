/**
 * CodeBlockFullscreen Component
 *
 * A fullscreen code viewer dialog with syntax highlighting and copy functionality.
 * Uses the unified modal store for state management.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ModalLayer } from '@components/ui/ModalLayer';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $codeFullscreenData, closeModal } from '@store/modal';

/**
 * Parse inline style string to React CSSProperties
 */
function parseInlineStyles(styleString: string): React.CSSProperties {
  if (!styleString) return {};

  const styles: Record<string, string> = {};
  const declarations = styleString.split(';').filter((s) => s.trim());

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;

    const property = declaration.slice(0, colonIndex).trim();
    const value = declaration.slice(colonIndex + 1).trim();
    if (!property || !value) continue;

    const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styles[camelProperty] = value;
  }

  return styles as React.CSSProperties;
}

export default function CodeBlockFullscreen() {
  const data = useStore($codeFullscreenData);

  if (!data) return null;

  const preStyles = parseInlineStyles(data.preStyle);

  return (
    <ModalLayer open onClose={closeModal}>
      <MacToolbar language={data.language} onClose={closeModal}>
        <CopyButton text={data.code} showLabel />
      </MacToolbar>
      <div className="scroll-feather-mask flex-1 overflow-auto">
        <pre className={cn(data.preClassName, 'p-4')} style={preStyles}>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Safe - codeHTML comes from Shiki syntax highlighter output only */}
          <code className={data.codeClassName} dangerouslySetInnerHTML={{ __html: data.codeHTML }} />
        </pre>
      </div>
    </ModalLayer>
  );
}
