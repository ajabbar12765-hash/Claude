const PATHS = {
  sun: (
    <g>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" strokeLinecap="round" />
    </g>
  ),
  'cloud-sun': (
    <g>
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 2.5v1.6M3.3 8h1.6M12.7 8h-1M4.6 4.6l1.1 1.1M11.4 4.6l-1.1 1.1" strokeLinecap="round" />
      <path d="M6.5 20.5a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 16.9 12a3.6 3.6 0 0 1-.9 8.5H6.5Z" />
    </g>
  ),
  cloud: (
    <path d="M6.5 19a4.5 4.5 0 0 1-.6-8.96 6.5 6.5 0 0 1 12.6-2A4 4 0 0 1 17.5 19h-11Z" />
  ),
  fog: (
    <g strokeLinecap="round">
      <path d="M6.5 15a4.5 4.5 0 0 1-.6-8.96 6.5 6.5 0 0 1 12.1-1.8" />
      <path d="M4 18h16M2.5 21h19" />
    </g>
  ),
  drizzle: (
    <g strokeLinecap="round">
      <path d="M6.5 13a4.5 4.5 0 0 1-.6-8.96A6.5 6.5 0 0 1 18 6a4 4 0 0 1-1.5 7.9h-10Z" />
      <path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" />
    </g>
  ),
  rain: (
    <g strokeLinecap="round">
      <path d="M6.5 12a4.5 4.5 0 0 1-.6-8.96A6.5 6.5 0 0 1 18 5a4 4 0 0 1-1.5 7.9h-10Z" />
      <path d="M7 17l-1.5 4M12 17l-1.5 4M17 17l-1.5 4" />
    </g>
  ),
  snow: (
    <g strokeLinecap="round">
      <path d="M6.5 12a4.5 4.5 0 0 1-.6-8.96A6.5 6.5 0 0 1 18 5a4 4 0 0 1-1.5 7.9h-10Z" />
      <path d="M8 17v5M8 18.5l-2 1M8 18.5l2 1M8 20.5l-2-1M8 20.5l2-1" />
      <path d="M16 17v5M16 18.5l-2 1M16 18.5l2 1M16 20.5l-2-1M16 20.5l2-1" />
    </g>
  ),
  storm: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 11a4.5 4.5 0 0 1-.6-8.96A6.5 6.5 0 0 1 18 4a4 4 0 0 1-1.5 7.9h-10Z" />
      <path d="M13 13l-3.5 5h3L11 22l4.5-6h-3l1-3Z" />
    </g>
  ),
}

export default function WeatherIcon({ icon = 'cloud', size = 24, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      {PATHS[icon] || PATHS.cloud}
    </svg>
  )
}
