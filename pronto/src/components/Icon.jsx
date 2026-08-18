// A small, consistent set of hand-drawn-feeling line icons.
// Kept as one inline SVG map so the app has zero icon-library dependency.

const PATHS = {
  wave: 'M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
  sun: 'M12 5v-2M12 21v-2M5 12h-2M21 12h-2M6.3 6.3l-1.4-1.4M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  heart: 'M12 20s-7-4.4-9.5-9C1 7.8 2.4 5 5.3 5c1.9 0 3.3 1 4.7 2.9C11.4 6 12.8 5 14.7 5 17.6 5 19 7.8 21.5 11 19 15.6 12 20 12 20z',
  question: 'M9 9a3 3 0 115.2 2c-1 .9-2.2 1.3-2.2 3M12 17.5v.1M4 4l16 16M4 20L20 4',
  door: 'M6 21V4a1 1 0 011-1h8a1 1 0 011 1v17M4 21h16M14 12v.01',
  cup: 'M4 4h13v7a5 5 0 01-5 5H9a5 5 0 01-5-5V4zM17 7h1.5a2.5 2.5 0 010 5H17M7 21h6',
  droplet: 'M12 2s6 7 6 11.5a6 6 0 11-12 0C6 9 12 2 12 2z',
  croissant: 'M2 15c3-8 8-11 14-10 4 .6 6 3.4 6 6-3-1-5 .5-5 3 0 2 1.5 3 3 3-2 4-8 5-12 3-4-1.6-5-4-6 0z',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5c0-1.4 1.1-2.2 2.5-2.2s2.5.7 2.5 2c0 2.5-5 1.7-5 4.4 0 1.3 1.1 2.1 2.5 2.1s2.5-.8 2.5-2.2M12 6v1.3M12 16.7V18',
  fork: 'M7 2v8a2 2 0 002 2 2 2 0 002-2V2M9 12v10M15 2c-1 3-1 6 0 8s3 2 3 2v10',
  chair: 'M6 4v16M18 4v9M6 13h12M6 20h3M15 20h3M6 13V4a2 2 0 012-2h0',
  plate: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 21a5 5 0 100-10 5 5 0 000 10z',
  bread: 'M4 12c0-5 3.5-8 8-8s8 3 8 8-3 5-8 5-8 0-8-5zM8 9.5v3M12 8.5v4M16 9.5v3',
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15 9l-2 5-5 2 2-5 5-2z',
  pin: 'M12 22s7-7.4 7-12.6A7 7 0 105 9.4C5 14.6 12 22 12 22zM12 12a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2z',
  train: 'M6 3h12a2 2 0 012 2v9a4 4 0 01-4 4H8a4 4 0 01-4-4V5a2 2 0 012-2zM4 14h16M8 21l-2 2M16 21l2 2M9 7h6M8.5 17.5v.1M15.5 17.5v.1',
  ear: 'M8 12a5 5 0 015-5 5 5 0 015 5c0 3-2 4-2 6a2.5 2.5 0 01-5 0M8 12c0-1 0-4 3-5',
  cross: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v8M8 12h8',
  alert: 'M12 2L1 21h22L12 2zM12 9v5M12 17v.1',
  pill: 'M4.9 4.9a4.5 4.5 0 016.4 0l7.8 7.8a4.5 4.5 0 11-6.4 6.4L4.9 11.3a4.5 4.5 0 010-6.4zM9 9l6 6',
  wifi: 'M2 8.5a16 16 0 0120 0M5.5 12a11 11 0 0113 0M9 15.5a6 6 0 016 0M12 19v.1',
  basket: 'M4 10h16l-1.5 9a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 10zM8 10l1-5M16 10l-1-5M9 14v3M15 14v3',
  euro: 'M17 6a7 7 0 100 12M4 10h9M4 14h7M12 21a9 9 0 100-18 9 9 0 000 18z',
  chat: 'M4 5h16v11H8l-4 4V5z',
  shirt: 'M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7l4-4z',
  flame: 'M12 22c4 0 7-2.7 7-6.5 0-3-1.8-4.7-3-6.5-.3 1.6-1 2.6-1.8 3.2C14.7 9.7 14 7 11 2c-.3 3-1.6 5-3.2 6.8C6.3 10.5 5 12.2 5 15.5 5 19.3 8 22 12 22z',
  spark: 'M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6z',
  check: 'M4 12l6 6L20 6',
  x: 'M6 6l12 12M18 6L6 18',
  volume: 'M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 010 6M19.5 6.5a8 8 0 010 11',
  lock: 'M6 11V8a6 6 0 1112 0v3M5 11h14v9H5v-9zM12 15v2',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  home: 'M4 11l8-7 8 7M6 10v10h12V10',
  user: 'M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM4 21c1.4-4.6 5-7 8-7s6.6 2.4 8 7',
  trophy: 'M8 4h8v4a4 4 0 01-8 0V4zM8 5H5a3 3 0 003 3M16 5h3a3 3 0 01-3 3M10 14v3h4v-3M9 21h6',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12v.1',
  refresh: 'M4 4v5h5M20 20v-5h-5M4.6 15A8 8 0 0019 9M19.4 9A8 8 0 005 15',
  map: 'M9 3L4 5v16l5-2 6 2 5-2V3l-5 2-6-2zM9 3v16M15 5v16',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5.9 1 .9 1.6v.5h5.2v-.5c0-.6.4-1.1.9-1.6A6 6 0 0012 3z',
}

export default function Icon({ name, size = 24, strokeWidth = 1.8, className = '', ...rest }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon icon-${name} ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
