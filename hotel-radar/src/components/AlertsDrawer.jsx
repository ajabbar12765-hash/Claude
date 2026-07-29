import { useEffect } from 'react'
import { hotelById } from '../lib/catalog.js'
import { bookingLinks } from '../lib/deeplinks.js'
import { timeAgo } from '../lib/format.js'

export default function AlertsDrawer({
  open,
  alerts,
  trip,
  money,
  onClose,
  onOpenAlert,
  onMarkAllRead,
  onClear,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const unread = alerts.filter((a) => !a.read).length

  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        className={`drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Deal messages"
        aria-hidden={!open}
      >
        <header className="drawer__head">
          <div>
            <h2>Messages</h2>
            <p>
              {alerts.length === 0
                ? 'Deal alerts land here'
                : `${alerts.length} alert${alerts.length === 1 ? '' : 's'}${unread ? ` · ${unread} unread` : ''}`}
            </p>
          </div>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close messages">
            ✕
          </button>
        </header>

        {alerts.length > 0 && (
          <div className="drawer__tools">
            <button className="btn btn--link" onClick={onMarkAllRead} disabled={!unread}>
              Mark all read
            </button>
            <button className="btn btn--link btn--danger" onClick={onClear}>
              Clear all
            </button>
          </div>
        )}

        <div className="drawer__body">
          {alerts.length === 0 ? (
            <div className="empty empty--drawer">
              <span className="empty__glyph" aria-hidden="true">
                🔔
              </span>
              <h3>No alerts yet</h3>
              <p>
                The radar is scanning. The moment a stay matching your filters drops to or
                below your budget, the message arrives here with the price and a link
                straight to booking.
              </p>
            </div>
          ) : (
            <ul className="alertList">
              {alerts.map((alert) => {
                const hotel = hotelById(alert.hotelId)
                const url = hotel ? bookingLinks(hotel, trip).booking : null
                const pct = Math.round(alert.discount * 100)
                return (
                  <li
                    key={alert.id}
                    className={`alert ${alert.read ? '' : 'is-unread'} ${alert.flash ? 'is-flash' : ''}`}
                  >
                    <div className="alert__top">
                      <span className="alert__price">{money(alert.price)}</span>
                      <span className="alert__basis">
                        {alert.basis === 'total' ? `total · ${alert.nights}n` : 'per night'}
                      </span>
                      {pct >= 3 && <span className="alert__pct">−{pct}%</span>}
                      <span className="alert__time">{timeAgo(alert.at)}</span>
                    </div>

                    <h3 className="alert__hotel">{alert.hotelName}</h3>
                    <p className="alert__where">
                      <span className="alert__stars">{'★'.repeat(alert.stars)}</span>
                      {alert.landmarkName && alert.distanceToLandmark != null
                        ? ` ${alert.distanceToLandmark.toFixed(1)} km from ${alert.landmarkName}`
                        : ` ${alert.area}, ${alert.city}`}
                      {' · '}
                      {alert.rating.toFixed(1)} guest score
                    </p>

                    <p className="alert__reason">
                      {alert.initial
                        ? 'Best match in budget right now'
                        : alert.repeat
                          ? 'Dropped further'
                          : 'Dropped into budget'}{' '}
                      — your ceiling is {money(alert.budget)}
                      {alert.reference > alert.price && <>, was {money(alert.reference)}</>}
                    </p>

                    <div className="alert__actions">
                      {url && (
                        <a
                          className="btn btn--primary btn--sm"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onOpenAlert(alert)}
                        >
                          Book <span aria-hidden="true">↗</span>
                        </a>
                      )}
                      {!alert.read && (
                        <button className="btn btn--link" onClick={() => onOpenAlert(alert)}>
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
