/**
 * Shared SVG icons for markdown content toolbars.
 *
 * Most icons have been migrated to @iconify/react (ri:* prefix).
 * Only CheckIcon remains hand-written due to its SMIL stroke animation.
 */

import { useId } from 'react';

interface IconProps {
  className?: string;
}

export function CheckIcon({ className }: IconProps) {
  const maskId = useId();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className={className}>
      <title>Copied</title>
      <mask id={maskId}>
        <g
          fill="none"
          stroke="#fff"
          strokeDasharray="24"
          strokeDashoffset="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M2 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="24;0" />
          </path>
          <path stroke="#000" strokeWidth="6" d="M7.5 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0" />
          </path>
          <path d="M7.5 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0" />
          </path>
        </g>
      </mask>
      <rect width="24" height="24" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
