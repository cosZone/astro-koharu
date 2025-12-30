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
          d="M12.1264 23.3391V17.0277H0.00717316V38H47.9928V17.0277H35.8736V23.3391H12.1264ZM0 13.6747L10.4433 0H37.5567L48 13.6747H32.5869V19.9862H15.4131V13.6747H0Z"
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
