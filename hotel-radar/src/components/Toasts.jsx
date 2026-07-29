import { hotelById } from '../lib/catalog.js'
import { bookingLinks } from '../lib/deeplinks.js'

/** In-page deal messages, for when notifications are off or the tab is focused. */
export default function Toasts({ toasts, trip, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const hotel = hotelById(t.alert.hotelId)
        const url = hotel ? bookingLinks(hotel, trip).booking : null
        return (
          <div className="toast" key={t.id}>
            <span className="toast__spark" aria-hidden="true">
              {t.alert.flash ? '⚡' : '🎯'}
            </span>
            <div className="toast__text">
              <strong>{t.title}</strong>
              <span>{t.body}</span>
            </div>
            <div className="toast__actions">
              {url && (
                <a className="btn btn--sm btn--primary" href={url} target="_blank" rel="noopener noreferrer">
                  Book
                </a>
              )}
              <button
                className="btn btn--ghost btn--icon btn--sm"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
