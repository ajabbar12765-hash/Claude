// Volpe — Pronto's mascot. A small, quick, clever fox: the opposite of a
// wise old owl sitting still in a tree. One SVG body, swappable face states
// so every screen shares the same character without shipping raster assets.

const FACES = {
  idle: {
    eyes: <>
      <circle cx="79" cy="90" r="7.5" fill="#221813" />
      <circle cx="121" cy="90" r="7.5" fill="#221813" />
      <circle cx="81.5" cy="87.5" r="2.2" fill="#fff" />
      <circle cx="123.5" cy="87.5" r="2.2" fill="#fff" />
    </>,
    mouth: <path d="M86 112 Q100 122 114 112" stroke="#221813" strokeWidth="4" fill="none" strokeLinecap="round" />,
  },
  happy: {
    eyes: <>
      <path d="M71 88 Q79 80 87 88" stroke="#221813" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M113 88 Q121 80 129 88" stroke="#221813" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </>,
    mouth: <path d="M82 110 Q100 132 118 110 Q100 126 82 110 Z" fill="#221813" />,
  },
  thinking: {
    eyes: <>
      <circle cx="79" cy="89" r="7" fill="#221813" />
      <circle cx="121" cy="86" r="7" fill="#221813" />
      <circle cx="80.5" cy="86.5" r="2" fill="#fff" />
      <circle cx="122.5" cy="83.5" r="2" fill="#fff" />
    </>,
    mouth: <circle cx="100" cy="114" r="4.5" fill="#221813" />,
  },
  talking: {
    eyes: <>
      <circle cx="79" cy="90" r="7.5" fill="#221813" />
      <circle cx="121" cy="90" r="7.5" fill="#221813" />
      <circle cx="81.5" cy="87.5" r="2.2" fill="#fff" />
      <circle cx="123.5" cy="87.5" r="2.2" fill="#fff" />
    </>,
    mouth: <ellipse cx="100" cy="115" rx="11" ry="9" fill="#221813" className="mascot-mouth-talk" />,
  },
  sleepy: {
    eyes: <>
      <path d="M71 90 L87 90" stroke="#221813" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M113 90 L129 90" stroke="#221813" strokeWidth="4.5" strokeLinecap="round" />
    </>,
    mouth: <path d="M90 114 Q100 118 110 114" stroke="#221813" strokeWidth="4" fill="none" strokeLinecap="round" />,
  },
}

export default function Mascot({ expression = 'idle', size = 96, celebrate = false, className = '' }) {
  const face = FACES[expression] || FACES.idle

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 220"
      className={`mascot mascot-${expression} ${celebrate ? 'mascot-celebrate' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* tail */}
      <path d="M148 178 Q194 172 186 122 Q182 92 152 100 Q176 128 150 178 Z" fill="var(--mascot-body)" />
      <path d="M186 122 Q182 96 156 101 Q172 108 172 128 Q172 148 155 168 Z" fill="var(--mascot-cream)" opacity="0.9" />

      {/* paws (raise on celebrate) */}
      <g className="mascot-paw mascot-paw-left">
        <ellipse cx="52" cy="150" rx="13" ry="17" fill="var(--mascot-body)" />
      </g>
      <g className="mascot-paw mascot-paw-right">
        <ellipse cx="148" cy="150" rx="13" ry="17" fill="var(--mascot-body)" />
      </g>

      {/* body */}
      <ellipse cx="100" cy="168" rx="60" ry="44" fill="var(--mascot-body)" />
      <ellipse cx="100" cy="184" rx="34" ry="20" fill="var(--mascot-cream)" />

      {/* neckerchief */}
      <path d="M66 132 L134 132 L100 164 Z" fill="var(--mascot-scarf)" />
      <circle cx="100" cy="136" r="7" fill="var(--mascot-scarf)" />

      {/* ears */}
      <path d="M52 58 L34 2 L92 42 Z" fill="var(--mascot-body)" />
      <path d="M56 52 L46 16 L82 40 Z" fill="var(--mascot-cream)" />
      <path d="M148 58 L166 2 L108 42 Z" fill="var(--mascot-body)" />
      <path d="M144 52 L154 16 L118 40 Z" fill="var(--mascot-cream)" />

      {/* head */}
      <circle cx="100" cy="96" r="64" fill="var(--mascot-body)" />

      {/* muzzle */}
      <ellipse cx="100" cy="112" rx="36" ry="27" fill="var(--mascot-cream)" />

      {/* cheeks */}
      <ellipse cx="62" cy="108" rx="10" ry="7" fill="var(--mascot-blush)" opacity="0.7" />
      <ellipse cx="138" cy="108" rx="10" ry="7" fill="var(--mascot-blush)" opacity="0.7" />

      {/* nose */}
      <path d="M100 96 L92 104 L108 104 Z" fill="#221813" />

      {face.eyes}
      {face.mouth}
    </svg>
  )
}
