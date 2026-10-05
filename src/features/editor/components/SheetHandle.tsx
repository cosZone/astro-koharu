import { useRef } from 'react';

interface Props {
  /** Called on a dismissing release; the sheet keeps its dragged offset so the exit continues from there. */
  onDismiss: () => void;
}

interface Drag {
  pointerId: number;
  y: number;
  sheet: HTMLElement;
  offset: number;
  samples: { y: number; time: number }[];
}

const VELOCITY_WINDOW_MS = 100;

/** Release speed (px/ms) over the last few samples, so a drag that pauses before lifting is not a flick. */
function releaseVelocity(samples: Drag['samples']) {
  const last = samples.at(-1);
  const first = samples.find((sample) => last && last.time - sample.time <= VELOCITY_WINDOW_MS);
  if (!last || !first || last === first) return 0;
  return (last.y - first.y) / Math.max(1, last.time - first.time);
}

export default function SheetHandle({ onDismiss }: Props) {
  const drag = useRef<Drag | null>(null);

  const settle = (sheet: HTMLElement) => {
    sheet.style.transition = '';
    sheet.style.translate = '';
  };

  return (
    <div
      className="editor-sheet-handle"
      aria-hidden="true"
      onPointerDown={(event) => {
        const sheet = event.currentTarget.closest<HTMLElement>('.editor-panel');
        if (!sheet || drag.current || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        sheet.style.transition = 'none';
        const sample = { y: event.clientY, time: event.timeStamp };
        drag.current = { pointerId: event.pointerId, y: event.clientY, sheet, offset: 0, samples: [sample] };
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (state?.pointerId !== event.pointerId) return;
        const delta = event.clientY - state.y;
        state.offset = delta > 0 ? delta : delta / 6;
        state.samples = [...state.samples.slice(-5), { y: event.clientY, time: event.timeStamp }];
        state.sheet.style.translate = `0 ${state.offset}px`;
      }}
      onPointerUp={(event) => {
        const state = drag.current;
        if (state?.pointerId !== event.pointerId) return;
        drag.current = null;
        const velocity = releaseVelocity([...state.samples, { y: event.clientY, time: event.timeStamp }]);
        if (state.offset > state.sheet.offsetHeight * 0.25 || (state.offset > 24 && velocity > 0.6)) onDismiss();
        else settle(state.sheet);
      }}
      onPointerCancel={(event) => {
        const state = drag.current;
        if (state?.pointerId !== event.pointerId) return;
        drag.current = null;
        settle(state.sheet);
      }}
    />
  );
}
