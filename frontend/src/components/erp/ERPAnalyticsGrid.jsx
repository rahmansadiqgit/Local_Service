export default function ERPAnalyticsGrid({ analytics, ratingsByProvider }) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="card">
        <p className="text-sm text-slate-500">Total Tasks</p>
        <p className="mt-2 text-2xl font-semibold">{analytics.total}</p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-500">Completed</p>
        <p className="mt-2 text-2xl font-semibold">{analytics.completed}</p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-500">Pending</p>
        <p className="mt-2 text-2xl font-semibold">{analytics.pending}</p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-500">Revenue</p>
        <p className="mt-2 text-2xl font-semibold">${analytics.revenue.toFixed(2)}</p>
      </div>
      <div className="card">
        <p className="text-sm text-slate-500">Top Rated Workers</p>
        <div className="mt-2 space-y-1 text-sm">
          {ratingsByProvider.slice(0, 3).map((row) => (
            <div key={row.providerId} className="flex items-center justify-between">
              <span>Provider #{row.providerId}</span>
              <span className="font-semibold">{row.average.toFixed(2)}</span>
            </div>
          ))}
          {ratingsByProvider.length === 0 && <p className="text-xs text-slate-400">No ratings yet.</p>}
        </div>
      </div>
    </div>
  )
}
