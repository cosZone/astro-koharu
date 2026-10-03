export interface EditorDraft {
  id: string;
  title: string;
  source: string;
  updated: number;
  filename?: string;
}

export type DraftSummary = Omit<EditorDraft, 'source'>;
const indexKey = 'koharu-editor:drafts:v1';
const activeKey = 'koharu-editor:active:v1';
const draftKey = (id: string) => `koharu-editor:draft:${id}`;

export function listDrafts(storage: Storage): DraftSummary[] {
  try {
    const data: unknown = JSON.parse(storage.getItem(indexKey) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(
      (entry): entry is DraftSummary =>
        entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.updated === 'number',
    );
  } catch {
    return [];
  }
}

export function readDraft(storage: Storage, id: string): EditorDraft | null {
  try {
    const draft = JSON.parse(storage.getItem(draftKey(id)) ?? 'null');
    return draft?.id === id && typeof draft.source === 'string' ? draft : null;
  } catch {
    return null;
  }
}

export function writeDraft(storage: Storage, draft: EditorDraft): void {
  const { source, ...summary } = draft;
  const index = listDrafts(storage).filter((entry) => entry.id !== draft.id);
  storage.setItem(draftKey(draft.id), JSON.stringify({ ...summary, source }));
  storage.setItem(indexKey, JSON.stringify([summary, ...index]));
  storage.setItem(activeKey, draft.id);
}

export function activeDraft(storage: Storage): EditorDraft | null {
  const active = storage.getItem(activeKey);
  return active ? readDraft(storage, active) : null;
}

export function removeDraft(storage: Storage, id: string): void {
  storage.setItem(indexKey, JSON.stringify(listDrafts(storage).filter((draft) => draft.id !== id)));
  storage.removeItem(draftKey(id));
  if (storage.getItem(activeKey) === id) storage.removeItem(activeKey);
}
