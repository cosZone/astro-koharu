import { isMotionDisabled } from '@lib/motion-level';

// The sheet curve: leaves at once, settles softly. Shared by enter and exit so a drag release continues seamlessly.
const SHEET_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const isBottomSheet = () => window.matchMedia('(width <= 800px)').matches;

function parts(dialog: HTMLDialogElement) {
  return {
    sheet: dialog.querySelector<HTMLElement>('.editor-panel'),
    scrim: dialog.querySelector<HTMLElement>('.editor-panel-scrim'),
  };
}

function hiddenOffset() {
  return isBottomSheet() ? '0 100%' : '100% 0';
}

/** Stops a running exit so a panel reopened mid-animation starts from a clean state. */
export function cancelSheetMotion(dialog: HTMLDialogElement) {
  const { sheet, scrim } = parts(dialog);
  for (const element of [sheet, scrim]) for (const animation of element?.getAnimations() ?? []) animation.cancel();
  if (sheet) {
    sheet.style.translate = '';
    sheet.style.transition = '';
  }
  delete dialog.dataset.closing;
  dialog.inert = false;
}

export function playSheetEnter(dialog: HTMLDialogElement) {
  const { sheet, scrim } = parts(dialog);
  if (!sheet || !scrim || isMotionDisabled()) return;
  const bottom = isBottomSheet();
  sheet.animate({ translate: [hiddenOffset(), '0 0'] }, { duration: bottom ? 440 : 380, easing: SHEET_EASE });
  scrim.animate({ opacity: [0, 1] }, { duration: 300, easing: 'ease-out' });
}

/**
 * Animates an already closed (non-modal) dialog out, starting from wherever a drag left the sheet.
 * The page is interactive again immediately; only the visuals linger.
 */
export function playSheetExit(dialog: HTMLDialogElement): Promise<void> {
  const { sheet, scrim } = parts(dialog);
  const reset = () => {
    if (sheet) {
      sheet.style.translate = '';
      sheet.style.transition = '';
    }
    delete dialog.dataset.closing;
    dialog.inert = false;
  };
  if (!sheet || !scrim || isMotionDisabled()) {
    reset();
    return Promise.resolve();
  }
  dialog.dataset.closing = '';
  dialog.inert = true;
  const from = sheet.style.translate || getComputedStyle(sheet).translate;
  const options = { duration: isBottomSheet() ? 320 : 260, easing: SHEET_EASE, fill: 'forwards' } as const;
  const slide = sheet.animate({ translate: [from === 'none' ? '0 0' : from, hiddenOffset()] }, options);
  const fade = scrim.animate({ opacity: [Number(getComputedStyle(scrim).opacity), 0] }, options);
  return Promise.all([slide.finished, fade.finished]).then(
    () => {
      reset();
      slide.cancel();
      fade.cancel();
    },
    // Cancelled by a reopen, which has already reset the dialog.
    () => undefined,
  );
}
