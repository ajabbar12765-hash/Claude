import { monthLabel, shiftMonth, isCurrentMonth } from '../lib/dates'

export default function MonthSwitcher({ monthKey, onChange }) {
  return (
    <div className="month-switcher">
      <button aria-label="Previous month" onClick={() => onChange(shiftMonth(monthKey, -1))}>
        ‹
      </button>
      <div className="month-switcher-label">
        {monthLabel(monthKey)}
        {isCurrentMonth(monthKey) && <span className="pill pill--now">Current</span>}
      </div>
      <button aria-label="Next month" onClick={() => onChange(shiftMonth(monthKey, 1))}>
        ›
      </button>
    </div>
  )
}
