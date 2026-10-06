/**
 * Post action configuration (`postActions:` in `config/site.yaml`).
 *
 * Controls the Markdown actions next to a post's breadcrumb: copying or
 * downloading the full source and opening it in the writing room.
 */

const OPEN_IN_EDITOR_MODES = ['off', 'dev', 'everyone'] as const;
export type OpenInEditorMode = (typeof OPEN_IN_EDITOR_MODES)[number];

export interface ResolvedPostActionsConfig {
  copyMarkdown: boolean;
  downloadMarkdown: boolean;
  /** `dev` shows the entry only on the local dev server; it also needs `editor.enabled`. */
  openInEditor: OpenInEditorMode;
}

export const POST_ACTIONS_DEFAULTS: ResolvedPostActionsConfig = {
  copyMarkdown: true,
  downloadMarkdown: true,
  openInEditor: 'dev',
};

export function normalizePostActionsConfig(raw: unknown): ResolvedPostActionsConfig {
  if (raw === undefined || raw === null) return { ...POST_ACTIONS_DEFAULTS };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Post actions configuration error: "postActions" must be an object.');
  }
  const source = raw as Record<string, unknown>;
  for (const key of ['copyMarkdown', 'downloadMarkdown'] as const) {
    if (source[key] !== undefined && typeof source[key] !== 'boolean') {
      throw new Error(`Post actions configuration error: "${key}" must be a boolean.`);
    }
  }
  const openInEditor = source.openInEditor ?? POST_ACTIONS_DEFAULTS.openInEditor;
  if (!OPEN_IN_EDITOR_MODES.includes(openInEditor as OpenInEditorMode)) {
    throw new Error(`Post actions configuration error: "openInEditor" must be one of: ${OPEN_IN_EDITOR_MODES.join(', ')}.`);
  }
  return {
    copyMarkdown: (source.copyMarkdown as boolean | undefined) ?? POST_ACTIONS_DEFAULTS.copyMarkdown,
    downloadMarkdown: (source.downloadMarkdown as boolean | undefined) ?? POST_ACTIONS_DEFAULTS.downloadMarkdown,
    openInEditor: openInEditor as OpenInEditorMode,
  };
}

/** Whether "open in writing room" is offered for the current build. */
export function isOpenInEditorAvailable(config: ResolvedPostActionsConfig, editorEnabled: boolean, isDev: boolean): boolean {
  if (!editorEnabled) return false;
  return config.openInEditor === 'everyone' || (config.openInEditor === 'dev' && isDev);
}
