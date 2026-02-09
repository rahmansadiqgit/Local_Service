export default function NotificationPanel({ notifications = [] }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <span className="text-xs text-slate-500">{notifications.length} total</span>
      </div>
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          notifications.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                note.is_read
                  ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                  : 'border-brand-200 bg-brand-50 text-slate-700 dark:border-brand-500/40 dark:bg-slate-900'
              }`}
            >
              <p className="font-semibold">{note.title}</p>
              <p className="mt-1 text-xs">{note.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
