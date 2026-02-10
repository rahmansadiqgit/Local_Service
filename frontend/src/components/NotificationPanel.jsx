import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const typeMatchers = [
  { label: 'Booking', match: /booking/i, link: '/manage-post' },
  { label: 'Assignment', match: /assign|worker/i, link: '/erp' },
  { label: 'ERP', match: /erp|task|status/i, link: '/erp' },
  { label: 'Rating', match: /rating/i, link: '/dashboard' },
  { label: 'Profile', match: /profile/i, link: '/profile' },
]

export default function NotificationPanel({
  notifications = [],
  title = 'Notifications',
  compact = false,
  onRefresh,
  onMarkRead,
}) {
  const navigate = useNavigate()

  const enriched = useMemo(() => {
    return notifications.map((note) => {
      const match = typeMatchers.find((item) =>
        item.match.test(`${note.title} ${note.message}`),
      )
      return {
        ...note,
        badge: match?.label || 'Update',
        link: match?.link || '/',
      }
    })
  }, [notifications])

  return (
    <div className={compact ? 'space-y-3' : 'card space-y-4'}>
      <div className="flex items-center justify-between">
        <h3 className={compact ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs font-semibold text-brand-600"
            >
              Refresh
            </button>
          )}
          <span className="text-xs text-slate-500">{notifications.length} total</span>
        </div>
      </div>
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {enriched.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          enriched.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                onMarkRead?.(note)
                navigate(note.link)
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                note.is_read
                  ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                  : 'border-brand-200 bg-brand-50 text-slate-700 dark:border-brand-500/40 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{note.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                  {note.badge}
                </span>
              </div>
              <p className="mt-1 text-xs">{note.message}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
