import { historyField } from '@codemirror/commands';
import { EditorState, type EditorStateConfig } from '@codemirror/state';

const fields = { history: historyField };
const key = (draftId: string) => `koharu-editor:history:v1:${draftId}`;

export function restoreEditorHistory(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  draftId: string,
  source: string,
  config: EditorStateConfig,
): EditorState | null {
  try {
    const serialized = storage.getItem(key(draftId));
    if (!serialized) return null;
    const saved = JSON.parse(serialized);
    if (saved?.doc !== source) {
      storage.removeItem(key(draftId));
      return null;
    }
    return EditorState.fromJSON(saved, config, fields);
  } catch {
    return null;
  }
}

export function saveEditorHistory(storage: Pick<Storage, 'setItem'>, draftId: string, state: EditorState): void {
  try {
    storage.setItem(key(draftId), JSON.stringify(state.toJSON(fields)));
  } catch {
    // History is optional; source recovery remains in the independent browser draft store.
  }
}

export function clearEditorHistory(storage: Pick<Storage, 'removeItem'>, draftId: string): void {
  try {
    storage.removeItem(key(draftId));
  } catch {
    // An unavailable optional history store does not prevent deleting the source draft.
  }
}
