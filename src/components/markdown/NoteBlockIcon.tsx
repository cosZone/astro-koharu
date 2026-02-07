import { Icon } from '@iconify/react';

const NOTE_TYPES = ['default', 'primary', 'info', 'success', 'warning', 'danger'] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

const NOTE_ICON_MAP: Record<NoteType, { icon: string; colorVar: string }> = {
  default: { icon: 'ri:arrow-right-circle-fill', colorVar: '--shoka-default' },
  primary: { icon: 'ri:add-circle-fill', colorVar: '--primary' },
  info: { icon: 'ri:information-fill', colorVar: '--shoka-info' },
  success: { icon: 'ri:checkbox-circle-fill', colorVar: '--shoka-success' },
  warning: { icon: 'ri:error-warning-fill', colorVar: '--shoka-warning' },
  danger: { icon: 'ri:indeterminate-circle-fill', colorVar: '--shoka-danger' },
};

export function extractNoteType(element: HTMLElement): NoteType {
  for (const type of NOTE_TYPES) {
    if (element.classList.contains(`note-${type}`)) return type;
  }
  return 'default';
}

interface NoteBlockIconProps {
  noteType: NoteType;
}

export function NoteBlockIcon({ noteType }: NoteBlockIconProps) {
  const { icon, colorVar } = NOTE_ICON_MAP[noteType];
  return <Icon icon={icon} width="1.1em" height="1.1em" style={{ color: `hsl(var(${colorVar}))` }} aria-hidden="true" />;
}
