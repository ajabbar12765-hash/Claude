// Hand-drawn inline SVG icon set — stroke-based, 24px grid, currentColor.
// Used instead of emoji for all interface chrome (nav, actions, controls).

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Icon({ children, size = 18, className, ...rest }) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base} {...rest}>
      {children}
    </svg>
  )
}

export function IconGrid(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Icon>
  )
}

export function IconReceipt(props) {
  return (
    <Icon {...props}>
      <path d="M6 3h12v17.5l-2.5-1.5L13 20.5 10.5 19 8 20.5 5.5 19 6 20.5V3Z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" />
    </Icon>
  )
}

export function IconTarget(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Icon>
  )
}

export function IconRepeat(props) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 0 1 13.5-5.8L20 8.5" />
      <path d="M20 4.5v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.5 5.8L4 15.5" />
      <path d="M4 19.5v-4h4" />
    </Icon>
  )
}

export function IconTrophy(props) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v5.5A5 5 0 0 1 12 14.5 5 5 0 0 1 7 9.5V4Z" />
      <path d="M7 5.5H4.5A2.5 2.5 0 0 0 5.8 9.8L7 10.3" />
      <path d="M17 5.5h2.5a2.5 2.5 0 0 1-1.3 4.3L17 10.3" />
      <path d="M12 14.5V18M8.5 21h7M9.5 18h5v3h-5v-3Z" />
    </Icon>
  )
}

export function IconGear(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
    </Icon>
  )
}

export function IconChevronLeft(props) {
  return (
    <Icon {...props}>
      <path d="M14.5 5 8 12l6.5 7" />
    </Icon>
  )
}

export function IconChevronRight(props) {
  return (
    <Icon {...props}>
      <path d="M9.5 5 16 12l-6.5 7" />
    </Icon>
  )
}

export function IconClose(props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  )
}

export function IconTrash(props) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l.8 12.2A2 2 0 0 0 9.8 21h4.4a2 2 0 0 0 2-1.8L17 7" />
      <path d="M10.3 11v6M13.7 11v6" />
    </Icon>
  )
}

export function IconEdit(props) {
  return (
    <Icon {...props}>
      <path d="M4 20l.9-3.9L15.6 5.4a1.5 1.5 0 0 1 2.1 0l1 1a1.5 1.5 0 0 1 0 2.1L8 19.1 4 20Z" />
      <path d="M13.7 7.3l3 3" />
    </Icon>
  )
}

export function IconPlus(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function IconWallet(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M3.5 7.5v10A2.5 2.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 18 8H6a2.5 2.5 0 0 1-2.5-2.5Z" />
      <circle cx="16" cy="13" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconBanknote(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9v0M17.5 15v0" />
    </Icon>
  )
}

export function IconCalendarDue(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
      <path d="M8.5 14.5h3v3h-3z" />
    </Icon>
  )
}

export function IconDownload(props) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v11.5M8 11l4 4 4-4" />
      <path d="M4.5 17v2A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </Icon>
  )
}

export function IconAlertTriangle(props) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4.2M12 17v0" />
    </Icon>
  )
}

export function IconSparkle(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </Icon>
  )
}
