/**
 * Empty
 * @constructor
 */
export default function EmptySvg({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="38" viewBox="0 0 48 38" fill="current" aria-hidden="true">
      <g filter="url(#filter0_b_3364_6889)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.13 23.34V17.03H0.01V38H47.99V17.03H35.87V23.34H12.13ZM0 13.67L10.44 0H37.56L48 13.67H32.59V19.99H15.41V13.67H0Z"
          fill="current"
        />
      </g>
      <defs>
        <filter
          id="filter0_b_3364_6889"
          x="-50"
          y="-50"
          width="148"
          height="138"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feGaussianBlur in="BackgroundImageFix" stdDeviation="25" />
          <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_3364_6889" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_3364_6889" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}
