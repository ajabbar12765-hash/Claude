import { monthLabel, shiftMonth, isCurrentMonth } from '../lib/dates'
import { IconChevronLeft, IconChevronRight } from './icons'

export default function MonthSwitcher({ monthKey, onChange }) {
  return (
    <div className="month-switcher">
      <button aria-label="Previous month" onClick={() => onChange(shiftMonth(monthKey, -1))}>
        <IconChevronLeft size={16} />
      </button>
      <div className="month-switcher-label">
        {monthLabel(monthKey)}
        {isCurrentMonth(monthKey) && <span className="pill pill--now">Current</span>}
      </div>
      <button aria-label="Next month" onClick={() => onChange(shiftMonth(monthKey, 1))}>
        <IconChevronRight size={16} />
      </button>
    </div>
  )
}
